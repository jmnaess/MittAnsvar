import { MONTH_NAMES } from '../../lib/dates';
import type { Household, HomeProfile } from '../household/types';
import { describeRecurrence, isSeasonal } from '../tasks/recurrence';
import { isLongInterval, taskSection } from '../tasks/section';
import type { Recurrence, Task } from '../tasks/types';
import { meetsRequires } from './requires';
import type { TaskTemplate } from './types';

/** Det utvalget trenger om husstanden: husstandstype og hjemprofilen (med boligtype). */
export type SuggestionHousehold = Pick<Household, 'type'> & HomeProfile;

/** Riktig husstandstype og boligtype (null = alle), og betingelsene på hjemprofilen (requires). */
export function fitsHousehold(t: TaskTemplate, household: SuggestionHousehold): boolean {
  return (
    (t.household_types === null || t.household_types.includes(household.type)) &&
    (t.housing_types === null || t.housing_types.includes(household.housing_type)) &&
    meetsRequires(t.requires, household)
  );
}

/**
 * Årshjulet: årlige maler med måned, sesongmaler (i periodens første måned) og lange
 * intervallmaler (minst ca. 3 måneder, under «Med jevne mellomrom»). Se tasks/section.ts.
 */
function isYearWheelTemplate(t: TaskTemplate): boolean {
  return (t.recurrence_unit === 'year' && t.month !== null) || isSeasonal(t) || isLongInterval(t);
}

/** Måneden en rad står under i årshjulet: årlig måned, eller periodens første måned. */
export function yearWheelMonth(r: Pick<Task, 'month' | 'season_start_month'>): number | null {
  return r.month ?? r.season_start_month;
}

/** Intervallmal («hver 8. uke etter sist utført»). Foreslås fra hjemprofilen. Lange intervaller er også i årshjulet. */
export function isIntervalTemplate(t: Pick<TaskTemplate, 'recurrence_type'>): boolean {
  return t.recurrence_type === 'interval';
}

/** Maler i årshjulet som passer husstanden. */
export function suggestForHousehold(
  templates: TaskTemplate[],
  household: SuggestionHousehold,
): TaskTemplate[] {
  return templates.filter((t) => isYearWheelTemplate(t) && fitsHousehold(t, household));
}

/**
 * Malene årshjulet viser: de som passer husstanden, og de husstanden allerede har aktive
 * (også om svarene i hjemprofilen er endret siden, eller malen har fått en betingelse).
 * En aktiv oppgave skal aldri forsvinne fra årshjulet fordi et svar ble endret.
 */
export function yearWheelTemplates(
  templates: TaskTemplate[],
  household: SuggestionHousehold,
  active: Set<string>,
): TaskTemplate[] {
  return templates.filter(
    (t) => isYearWheelTemplate(t) && (fitsHousehold(t, household) || active.has(t.id)),
  );
}

/** Maler hjemprofilen kan foreslå: årshjulet (også sesongmaler) og intervallmalene. */
function suggestForHomeProfile(templates: TaskTemplate[], household: SuggestionHousehold): TaskTemplate[] {
  return templates.filter(
    (t) => (isYearWheelTemplate(t) || isIntervalTemplate(t)) && fitsHousehold(t, household),
  );
}

/** Malene husstanden allerede har som (ikke-arkivert) oppgave. */
export function activeTemplateIds(tasks: Pick<Task, 'template_id'>[]): Set<string> {
  return new Set(tasks.flatMap((t) => (t.template_id ? [t.template_id] : [])));
}

/**
 * Forslag etter at hjemprofilen er lagret.
 *   before = null (første gang): alle maler som passer, også de uten betingelse.
 *   before = forrige profil:     bare maler som passer nå og IKKE passet før. En mal man valgte
 *                                bort forrige gang, kommer dermed ikke tilbake fordi man endret et
 *                                annet svar, bare hvis et svar gjør at den passer på nytt.
 * Maler som allerede er aktive, er aldri med. Eksisterende oppgaver røres ikke.
 * Både årshjulsmaler og intervallmaler er med.
 */
export function suggestAfterProfileChange(
  templates: TaskTemplate[],
  before: SuggestionHousehold | null,
  after: SuggestionHousehold,
  active: Set<string>,
): TaskTemplate[] {
  const matchedBefore = new Set(before ? suggestForHomeProfile(templates, before).map((t) => t.id) : []);
  const seen = new Set<string>();
  return suggestForHomeProfile(templates, after).filter((t) => {
    if (matchedBefore.has(t.id) || active.has(t.id) || seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

/** Én rad i forslagslisten: maler med samme tittel (f.eks. utedelen nov og jan) slått sammen. */
export type SuggestionGroup = {
  key: string;
  title: string;
  /** «Mars og september · 2 ganger i året» eller «8 uker etter sist» */
  when: string;
  templateIds: string[];
};

/**
 * Slår sammen årsmaler med samme tittel, i rekkefølgen den første av dem har.
 * Intervall- og sesongmaler får alltid sin egen rad, med gjentakelsen som tekst
 * («1 uke etter sist · mai–sep»).
 */
export function groupSuggestions(templates: TaskTemplate[]): SuggestionGroup[] {
  // Map beholder rekkefølgen nøklene ble lagt inn i.
  const groups = new Map<string, { first: TaskTemplate; months: number[]; templateIds: string[] }>();
  for (const t of templates) {
    const ownRow = isIntervalTemplate(t) || isSeasonal(t);
    const groupKey = ownRow ? `own:${t.id}` : `title:${t.title}`;
    const group = groups.get(groupKey) ?? { first: t, months: [], templateIds: [] };
    if (t.month !== null && !group.months.includes(t.month)) group.months.push(t.month);
    group.templateIds.push(t.id);
    groups.set(groupKey, group);
  }
  return [...groups.values()].map(({ first, months, templateIds }) => ({
    key: first.id,
    title: first.title,
    when: isIntervalTemplate(first) || isSeasonal(first)
      ? describeRecurrence({ ...first, job_repeats: false })
      : formatSuggestionWhen([...months].sort((a, b) => a - b)),
    templateIds,
  }));
}

/** «Mars og september · 2 ganger i året», «Oktober · hvert år». */
export function formatSuggestionWhen(months: number[]): string {
  const names = months.map((m) => MONTH_NAMES[m - 1]);
  const list =
    names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]}`;
  const often = months.length === 1 ? 'hvert år' : `${months.length} ganger i året`;
  return `${list.charAt(0).toUpperCase()}${list.slice(1)} · ${often}`;
}

/**
 * Husstandens egne oppgaver i årshjulet (taskSection = 'year': årlige, sesong og lange intervaller),
 * som ikke vises som en mal i årshjulet (de vises som malen, med bryter). En oppgave fra en mal
 * som ikke vises (f.eks. deaktivert), regnes som egen, så den ikke forsvinner fra årshjulet.
 * Arkiverte er allerede borte fra listen.
 */
export function isOwnYearlyTask(task: Task, shownTemplateIds: Set<string>): boolean {
  return (
    (task.template_id === null || !shownTemplateIds.has(task.template_id)) &&
    taskSection(task) === 'year'
  );
}

/** En rad i årshjulet: en mal (med bryter) eller en egen oppgave. */
export type YearItem =
  | { kind: 'template'; key: string; template: TaskTemplate }
  | { kind: 'own'; key: string; task: Task };

/** Nøkkelen til seksjonen «Med jevne mellomrom», etter desember. */
export const INTERVAL_SECTION_KEY = 'interval';

export type MonthSection = {
  key: string;
  /** 1–12, null for «Med jevne mellomrom». */
  month: number | null;
  title: string;
  data: YearItem[];
};

/**
 * Seksjonen en rad står i: måneden (årlig måned eller periodens første), eller
 * «Med jevne mellomrom» for lange intervaller uten periode (de har ingen fast måned).
 */
export function yearSectionKey(r: Pick<Task, 'month' | 'season_start_month'>): string {
  const month = yearWheelMonth(r);
  return month === null ? INTERVAL_SECTION_KEY : `month-${month}`;
}

/**
 * Januar til desember, så «Med jevne mellomrom». I hver seksjon: malene først (i malenes
 * rekkefølge), så egne oppgaver alfabetisk. Seksjoner uten noe er med, så hele året vises.
 */
export function groupByMonth(templates: TaskTemplate[], ownTasks: Task[]): MonthSection[] {
  const shown = new Set(templates.map((t) => t.id));
  const own = ownTasks
    .filter((t) => isOwnYearlyTask(t, shown))
    .sort((a, b) => a.title.localeCompare(b.title, 'nb'));
  const section = (key: string, month: number | null, title: string): MonthSection => ({
    key,
    month,
    title,
    data: [
      ...templates
        .filter((t) => yearSectionKey(t) === key)
        .map((template): YearItem => ({ kind: 'template', key: `t-${template.id}`, template })),
      ...own
        .filter((t) => yearSectionKey(t) === key)
        .map((task): YearItem => ({ kind: 'own', key: `o-${task.id}`, task })),
    ],
  });
  return [
    ...MONTH_NAMES.map((name, i) =>
      section(`month-${i + 1}`, i + 1, name.charAt(0).toUpperCase() + name.slice(1)),
    ),
    section(INTERVAL_SECTION_KEY, null, 'Med jevne mellomrom'),
  ];
}

/**
 * Raden i «Med jevne mellomrom»: «Hver 3. måned · neste i mars». Året tas med når fristen
 * ikke er i løpet av de neste tolv månedene («Hvert 2. år · neste i mars 2028»).
 * Uten frist (mal som ikke er på) bare gjentakelsen.
 */
export function describeEvery(
  r: Pick<Recurrence, 'recurrence_unit' | 'recurrence_every'>,
  nextDueOn: string | null,
  today: string,
): string {
  const every = r.recurrence_every ?? 1;
  const unit = r.recurrence_unit ?? 'month';
  const base =
    unit === 'year'
      ? every === 1 ? 'Hvert år' : `Hvert ${every}. år`
      : every === 1
        ? `Hver ${UNIT_SINGULAR[unit]}`
        : `Hver ${every}. ${UNIT_SINGULAR[unit]}`;
  if (!nextDueOn) return base;
  const [year, month] = nextDueOn.split('-').map(Number);
  const [todayYear, todayMonth] = today.split('-').map(Number);
  const ahead = (year - todayYear) * 12 + (month - todayMonth);
  const name = MONTH_NAMES[month - 1];
  return `${base} · neste i ${ahead >= 0 && ahead < 12 ? name : `${name} ${year}`}`;
}

const UNIT_SINGULAR: Record<'day' | 'week' | 'month', string> = { day: 'dag', week: 'uke', month: 'måned' };
