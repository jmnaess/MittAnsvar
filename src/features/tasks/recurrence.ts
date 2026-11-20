import {
  addDays,
  formatDate,
  formatLongDate,
  formatMonthYear,
  MONTH_ABBR,
  MONTH_NAMES,
  WEEKDAY_NAMES,
} from '../../lib/dates';
import { isPostponed } from './postpone';
import type { Recurrence } from './types';

/**
 * Månedsoppgave: årlig uten dag («i løpet av oktober»). Fristen er hele måneden.
 * Samme regel som private.is_month_task i databasen, men her bare for visning.
 */
export function isMonthTask(r: Recurrence): boolean {
  return r.recurrence_type === 'calendar' && r.recurrence_unit === 'year' && r.month_day === null;
}

/** Sesongoppgave: gjentas bare i en del av året («Hver uke · mai–sep»). */
export function isSeasonal(r: Pick<Recurrence, 'season_start_month'>): boolean {
  return r.season_start_month !== null;
}

const WORKDAYS = [1, 2, 3, 4, 5];

/**
 * Daglig: hver dag (fast eller 1 dag etter sist), eller hver uke på minst alle hverdagene.
 * Blir aldri forfalt, men starter på nytt neste dag den skal gjøres.
 * Samme regel som private.is_daily i databasen.
 */
export function isDailyRecurrence(
  r: Pick<Recurrence, 'recurrence_type' | 'recurrence_unit' | 'recurrence_every' | 'weekdays'>,
): boolean {
  if (r.recurrence_every !== 1) return false;
  if (r.recurrence_unit === 'day') return r.recurrence_type === 'calendar' || r.recurrence_type === 'interval';
  return (
    r.recurrence_type === 'calendar' &&
    r.recurrence_unit === 'week' &&
    WORKDAYS.every((d) => r.weekdays?.includes(d))
  );
}

/** Ekstrajobb: ingen dato, blir aldri forfalt (steg 9). */
export function isJob(r: Pick<Recurrence, 'recurrence_type'>): boolean {
  return r.recurrence_type === 'job';
}

/**
 * Neste frist med år: «november 2027» for månedsoppgaver, ellers «1. desember 2026».
 * En utsatt månedsoppgave har en fast dato.
 */
export function formatNextDue(
  task: Recurrence & { next_due_on: string | null; postponed_to?: string | null },
): string {
  if (isJob(task)) return 'Ekstrajobb';
  if (!task.next_due_on) return 'Ferdig';
  const postponed = isPostponed({ next_due_on: task.next_due_on, postponed_to: task.postponed_to ?? null });
  return isMonthTask(task) && !postponed
    ? formatMonthYear(task.next_due_on)
    : formatLongDate(task.next_due_on);
}

// Skjematilstand ↔ gjentakelseskolonnene i databasen, og en norsk beskrivelse.
// Neste frist beregnes IKKE her. Det gjør databasen (private.first_due og compute_next_due).

/** «Når?» i oppgaveskjemaet. I dag, I morgen og Velg dato er engangsoppgaver med dato. */
export type WhenChoice = 'today' | 'tomorrow' | 'date' | 'repeat';
/** Gjentakelse under «Gjentas». Ekstrajobber har sitt eget skjema (JobForm). */
export type RecurrenceMode = 'calendar' | 'interval';
export type CalendarUnit = 'week' | 'month' | 'year';
export type IntervalUnit = 'day' | 'week' | 'month' | 'year';

/** Gjentakelseskolonnene + datoen for en engangsoppgave (tasks.once_on). */
export type Schedule = Recurrence & { once_on: string | null };

/** Det skjemaet holder på mens brukeren fyller ut. Tall er tekst fordi de skrives i et felt. */
export type RecurrenceForm = {
  when: WhenChoice;
  /** 'YYYY-MM-DD' for «Velg dato». */
  date: string;
  mode: RecurrenceMode;
  calendarUnit: CalendarUnit;
  weekdays: number[]; // 1 = mandag … 7 = søndag
  everyOtherWeek: boolean;
  monthDay: string; // 1–31. Tom er lov for år («i løpet av måneden»).
  month: number; // 1–12
  intervalEvery: string;
  intervalUnit: IntervalUnit;
  /** «Bare deler av året»: aktiv periode fra–til måned (1–12). Kan gå over nyttår. */
  seasonal: boolean;
  seasonFrom: number;
  seasonTo: number;
};

/** Høyeste «hver N.» databasen tillater (check-constraint på recurrence_every). */
const MAX_EVERY = 100;

/** today = enhetens dato ('YYYY-MM-DD'). «Velg dato» starter på i overmorgen. */
export function defaultRecurrenceForm(today: string): RecurrenceForm {
  return {
    when: 'today',
    date: addDays(today, 2),
    mode: 'calendar',
    calendarUnit: 'week',
    weekdays: [],
    everyOtherWeek: false,
    monthDay: '1',
    month: 1,
    intervalEvery: '14',
    intervalUnit: 'day',
    seasonal: false,
    seasonFrom: 5,
    seasonTo: 9,
  };
}

/** Heltall i [min, max], ellers null. */
function parseIntIn(text: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const n = Number(text);
  return n >= min && n <= max ? n : null;
}

const NONE = {
  recurrence_unit: null,
  recurrence_every: null,
  weekdays: null,
  month_day: null,
  month: null,
  job_repeats: false,
  once_on: null,
  season_start_month: null,
  season_end_month: null,
};

/**
 * Skjema → kolonner. Gir null når skjemaet ikke er gyldig ennå.
 * I dag og I morgen regnes fra enhetens dato. Databasen flytter en dato som er passert i
 * husstandens tidssone, til i dag.
 */
export function toRecurrence(form: RecurrenceForm, today: string): Schedule | null {
  switch (form.when) {
    case 'today':
      return { recurrence_type: 'once', ...NONE, once_on: today };
    case 'tomorrow':
      return { recurrence_type: 'once', ...NONE, once_on: addDays(today, 1) };
    case 'date':
      return { recurrence_type: 'once', ...NONE, once_on: form.date };
    case 'repeat':
      return toRepeat(form);
  }
}

/** Kan gjentakelsen i skjemaet ha periode? Ikke årlige oppgaver (de har allerede en måned). */
export function canBeSeasonal(form: Pick<RecurrenceForm, 'mode' | 'calendarUnit'>): boolean {
  return form.mode === 'interval' || form.calendarUnit !== 'year';
}

/** Alle tolv måneder (f.eks. jan–des eller mar–feb) er det samme som ingen periode. */
function coversWholeYear(from: number, to: number): boolean {
  return to === ((from + 10) % 12) + 1;
}

/** Periodekolonnene fra skjemaet. null/null = hele året. */
function toSeason(form: RecurrenceForm): Pick<Schedule, 'season_start_month' | 'season_end_month'> {
  if (!form.seasonal || !canBeSeasonal(form) || coversWholeYear(form.seasonFrom, form.seasonTo)) {
    return { season_start_month: null, season_end_month: null };
  }
  return { season_start_month: form.seasonFrom, season_end_month: form.seasonTo };
}

function toRepeat(form: RecurrenceForm): Schedule | null {
  const season = toSeason(form);
  if (form.mode === 'interval') {
    const every = parseIntIn(form.intervalEvery, 1, MAX_EVERY);
    if (every === null) return null;
    return {
      recurrence_type: 'interval', ...NONE, ...season, recurrence_unit: form.intervalUnit, recurrence_every: every,
    };
  }

  const base = { recurrence_type: 'calendar' as const, ...NONE, ...season, recurrence_unit: form.calendarUnit };
  switch (form.calendarUnit) {
    case 'week':
      if (form.weekdays.length === 0) return null;
      return { ...base, recurrence_every: form.everyOtherWeek ? 2 : 1, weekdays: form.weekdays };
    case 'month': {
      const day = parseIntIn(form.monthDay, 1, 31);
      if (day === null) return null;
      return { ...base, recurrence_every: 1, month_day: day };
    }
    case 'year': {
      const day = form.monthDay.trim() === '' ? null : parseIntIn(form.monthDay, 1, 31);
      if (day === null && form.monthDay.trim() !== '') return null;
      // toSeason gir alltid null her (årlige oppgaver har ingen periode).
      return { ...base, recurrence_every: 1, month: form.month, month_day: day };
    }
  }
}

/**
 * Kolonner → skjema, når en oppgave skal endres.
 * En engangsoppgave vises med datoen sin: once_on, eller fristen for eldre oppgaver uten
 * once_on. Skjemaet viser bare det enkle (hver/annenhver uke, hver måned, hvert år). Har
 * oppgaven noe annet, vises det nærmeste. Felt som ikke endres, beholder verdien.
 */
export function fromRecurrence(
  r: Schedule & { next_due_on: string | null },
  today: string,
): RecurrenceForm {
  const form = defaultRecurrenceForm(today);

  if (r.recurrence_type === 'once') {
    const date = r.once_on ?? r.next_due_on ?? today;
    form.when = date === today ? 'today' : date === addDays(today, 1) ? 'tomorrow' : 'date';
    if (form.when === 'date') form.date = date;
    return form;
  }

  form.when = 'repeat';
  form.mode = r.recurrence_type === 'interval' ? 'interval' : 'calendar';

  if (r.recurrence_type === 'interval') {
    form.intervalEvery = String(r.recurrence_every ?? 1);
    form.intervalUnit = r.recurrence_unit ?? 'day';
  }

  if (r.recurrence_type === 'calendar') {
    form.calendarUnit = r.recurrence_unit === 'day' ? 'week' : (r.recurrence_unit ?? 'week');
    form.weekdays = r.recurrence_unit === 'day' ? [1, 2, 3, 4, 5, 6, 7] : (r.weekdays ?? []);
    form.everyOtherWeek = r.recurrence_unit === 'week' && r.recurrence_every === 2;
    form.monthDay = r.month_day === null ? (r.recurrence_unit === 'year' ? '' : '1') : String(r.month_day);
    form.month = r.month ?? 1;
  }

  if (r.season_start_month !== null && r.season_end_month !== null) {
    form.seasonal = true;
    form.seasonFrom = r.season_start_month;
    form.seasonTo = r.season_end_month;
  }

  return form;
}

const ONCE_HINT = 'Vises på dagen og forsvinner når den er gjort.';
const SEASON_HINT = 'Utenfor perioden vises den ikke.';

/**
 * Forklaringen under «Når?». Med periode sier den når første gang er, fordi den ikke er i dag
 * når denne måneden er utenfor perioden. Samme regel som private.first_due i databasen.
 */
export function repeatHint(form: RecurrenceForm, today: string): string {
  if (form.when !== 'repeat') return ONCE_HINT;
  const season = toSeason(form);
  const from = season.season_start_month;
  const outside = from !== null && !inSeason(Number(today.slice(5, 7)), from, season.season_end_month ?? from);

  if (form.mode === 'calendar') {
    const first = outside
      ? `Første gang er den første dagen som passer fra 1. ${MONTH_NAMES[from - 1]}.`
      : 'Første gang er den første dagen som passer, fra og med i dag.';
    return from === null ? first : `${first} ${SEASON_HINT}`;
  }
  const first = outside ? `Første gang er 1. ${MONTH_NAMES[from - 1]}.` : 'Første gang er i dag.';
  const rest = 'Deretter teller vi fra hver gang den blir gjort.';
  return from === null ? `${first} ${rest}` : `${first} ${rest} ${SEASON_HINT}`;
}

/** Er måneden (1–12) innenfor perioden from–to? Perioden kan gå over nyttår (okt–apr). */
export function inSeason(month: number, from: number, to: number): boolean {
  return from <= to ? month >= from && month <= to : month >= from || month <= to;
}

/** «mai–sep», «okt–apr». Én måned: «jun». */
export function formatSeason(from: number, to: number): string {
  return from === to ? MONTH_ABBR[from - 1] : `${MONTH_ABBR[from - 1]}–${MONTH_ABBR[to - 1]}`;
}

/** Har brukeren endret «Når?»? Brukes for å ikke røre datoen når bare tittelen endres. */
export function sameWhen(a: RecurrenceForm, b: RecurrenceForm): boolean {
  return a.when === b.when && (a.when !== 'date' || a.date === b.date);
}

/** «I dag», «I morgen» eller «Tor. 20. nov.» for en engangsoppgave, ellers som describeRecurrence. */
export function describeSchedule(s: Schedule, today: string): string {
  if (s.recurrence_type !== 'once' || !s.once_on) return describeRecurrence(s);
  if (s.once_on <= today) return 'I dag';
  if (s.once_on === addDays(today, 1)) return 'I morgen';
  return capitalize(formatDate(s.once_on));
}

// ---------------------------------------------------------------------------
// Beskrivelse: «Hver mandag», «Den 1. hver måned», «14 dager etter sist» …
// ---------------------------------------------------------------------------

const UNIT_WORDS: Record<string, [singular: string, plural: string]> = {
  day: ['dag', 'dager'],
  week: ['uke', 'uker'],
  month: ['måned', 'måneder'],
  year: ['år', 'år'],
};

/** ['mandag', 'onsdag', 'fredag'] → 'mandag, onsdag og fredag' */
function joinNorwegian(words: string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} og ${words[words.length - 1]}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** «hver», «annenhver» eller «hver 3.» */
function everyWord(every: number): string {
  if (every === 1) return 'hver';
  if (every === 2) return 'annenhver';
  return `hver ${every}.`;
}

/** «Hver lørdag · mai–sep». Uten periode som describeBase. */
export function describeRecurrence(r: Recurrence): string {
  const base = describeBase(r);
  if (r.season_start_month === null || r.season_end_month === null) return base;
  return `${base} · ${formatSeason(r.season_start_month, r.season_end_month)}`;
}

function describeBase(r: Recurrence): string {
  const every = r.recurrence_every ?? 1;

  if (r.recurrence_type === 'once') return 'Én gang';
  if (r.recurrence_type === 'job') return r.job_repeats ? 'Ekstrajobb, kan gjøres flere ganger' : 'Ekstrajobb';

  if (r.recurrence_type === 'interval') {
    const [singular, plural] = UNIT_WORDS[r.recurrence_unit ?? 'day'];
    return `${every} ${every === 1 ? singular : plural} etter sist`;
  }

  switch (r.recurrence_unit) {
    case 'day':
      return every === 1 ? 'Hver dag' : `Hver ${every}. dag`;
    case 'week': {
      const days = r.weekdays ?? [];
      if (days.length === 7 && every === 1) return 'Hver dag';
      const names = joinNorwegian(days.map((d) => WEEKDAY_NAMES[d - 1]));
      return every <= 2 ? capitalize(`${everyWord(every)} ${names}`) : `Hver ${every}. uke: ${names}`;
    }
    case 'month':
      return every === 1
        ? `Den ${r.month_day}. hver måned`
        : `Den ${r.month_day}. ${everyWord(every)} måned`;
    case 'year': {
      const month = MONTH_NAMES[(r.month ?? 1) - 1];
      const when = r.month_day === null ? `I ${month}` : `${r.month_day}. ${month}`;
      return every === 1 ? `${when} hvert år` : `${when} hvert ${every}. år`;
    }
    default:
      return '';
  }
}
