import { MONTH_NAMES, WEEKDAY_NAMES } from '../../lib/dates';
import type { Recurrence } from './types';

// Skjematilstand ↔ gjentakelseskolonnene i databasen, og en norsk beskrivelse.
// Neste frist beregnes IKKE her. Det gjør databasen (private.compute_next_due).

export type RecurrenceMode = 'calendar' | 'interval' | 'once';
export type CalendarUnit = 'week' | 'month' | 'year';
export type IntervalUnit = 'day' | 'week' | 'month' | 'year';

/** Det skjemaet holder på mens brukeren fyller ut. Tall er tekst fordi de skrives i et felt. */
export type RecurrenceForm = {
  mode: RecurrenceMode;
  calendarUnit: CalendarUnit;
  weekdays: number[]; // 1 = mandag … 7 = søndag
  everyOtherWeek: boolean;
  monthDay: string; // 1–31. Tom er lov for år («i løpet av måneden»).
  month: number; // 1–12
  intervalEvery: string;
  intervalUnit: IntervalUnit;
};

/** Høyeste «hver N.» databasen tillater (check-constraint på recurrence_every). */
const MAX_EVERY = 100;

export function defaultRecurrenceForm(): RecurrenceForm {
  return {
    mode: 'calendar',
    calendarUnit: 'week',
    weekdays: [],
    everyOtherWeek: false,
    monthDay: '1',
    month: 1,
    intervalEvery: '14',
    intervalUnit: 'day',
  };
}

/** Heltall i [min, max], ellers null. */
function parseIntIn(text: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const n = Number(text);
  return n >= min && n <= max ? n : null;
}

const NONE = { recurrence_unit: null, recurrence_every: null, weekdays: null, month_day: null, month: null };

/** Skjema → kolonner. Gir null når skjemaet ikke er gyldig ennå. */
export function toRecurrence(form: RecurrenceForm): Recurrence | null {
  if (form.mode === 'once') {
    return { recurrence_type: 'once', ...NONE };
  }

  if (form.mode === 'interval') {
    const every = parseIntIn(form.intervalEvery, 1, MAX_EVERY);
    if (every === null) return null;
    return { recurrence_type: 'interval', ...NONE, recurrence_unit: form.intervalUnit, recurrence_every: every };
  }

  const base = { recurrence_type: 'calendar' as const, ...NONE, recurrence_unit: form.calendarUnit };
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
      return { ...base, recurrence_every: 1, month: form.month, month_day: day };
    }
  }
}

/**
 * Kolonner → skjema, når en oppgave skal endres.
 * Skjemaet viser bare det enkle (hver/annenhver uke, hver måned, hvert år). Har oppgaven noe
 * annet, f.eks. fra en mal senere, vises det nærmeste. Felt som ikke endres, beholder verdien.
 */
export function fromRecurrence(r: Recurrence): RecurrenceForm {
  const form = defaultRecurrenceForm();
  form.mode = r.recurrence_type;

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

  return form;
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

export function describeRecurrence(r: Recurrence): string {
  const every = r.recurrence_every ?? 1;

  if (r.recurrence_type === 'once') return 'Én gang';

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
