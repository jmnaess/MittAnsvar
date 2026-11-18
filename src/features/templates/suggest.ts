import { MONTH_NAMES } from '../../lib/dates';
import type { Household, HomeProfile } from '../household/types';
import type { Task } from '../tasks/types';
import { meetsRequires } from './requires';
import type { TaskTemplate } from './types';

/** Det utvalget trenger om husstanden: husstandstype og hjemprofilen (med boligtype). */
export type SuggestionHousehold = Pick<Household, 'type'> & HomeProfile;

/**
 * Maler som passer husstanden: riktig husstandstype og boligtype (null = alle), og
 * betingelsene på hjemprofilen (requires). Bare årlige maler hører til årshjulet.
 */
export function suggestForHousehold(
  templates: TaskTemplate[],
  household: SuggestionHousehold,
): TaskTemplate[] {
  return templates.filter(
    (t) =>
      t.recurrence_unit === 'year' &&
      t.month !== null &&
      (t.household_types === null || t.household_types.includes(household.type)) &&
      (t.housing_types === null || t.housing_types.includes(household.housing_type)) &&
      meetsRequires(t.requires, household),
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
 */
export function suggestAfterProfileChange(
  templates: TaskTemplate[],
  before: SuggestionHousehold | null,
  after: SuggestionHousehold,
  active: Set<string>,
): TaskTemplate[] {
  const matchedBefore = new Set(before ? suggestForHousehold(templates, before).map((t) => t.id) : []);
  const seen = new Set<string>();
  return suggestForHousehold(templates, after).filter((t) => {
    if (matchedBefore.has(t.id) || active.has(t.id) || seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

/** Én rad i forslagslisten: maler med samme tittel (f.eks. filter vår og høst) slått sammen. */
export type SuggestionGroup = {
  key: string;
  title: string;
  /** 1–12, sortert */
  months: number[];
  templateIds: string[];
};

/** Slår sammen maler med samme tittel, i rekkefølgen den første av dem har. */
export function groupSuggestions(templates: TaskTemplate[]): SuggestionGroup[] {
  const groups = new Map<string, SuggestionGroup>();
  for (const t of templates) {
    const group = groups.get(t.title) ?? { key: t.id, title: t.title, months: [], templateIds: [] };
    if (t.month !== null && !group.months.includes(t.month)) group.months.push(t.month);
    group.templateIds.push(t.id);
    groups.set(t.title, group);
  }
  return [...groups.values()].map((g) => ({ ...g, months: [...g.months].sort((a, b) => a - b) }));
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
 * Husstandens egne årlige oppgaver: én gang i året i en bestemt måned (med eller uten dag),
 * og ikke laget fra en mal (de vises som malen, med bryter). Arkiverte er allerede borte fra
 * listen. «Hvert år etter sist utført» (intervall) har ingen fast måned og er ikke med.
 */
export function isOwnYearlyTask(task: Task): boolean {
  return (
    task.template_id === null &&
    task.recurrence_type === 'calendar' &&
    task.recurrence_unit === 'year' &&
    task.month !== null
  );
}

/** En rad i årshjulet: en mal (med bryter) eller en egen oppgave. */
export type YearItem =
  | { kind: 'template'; key: string; template: TaskTemplate }
  | { kind: 'own'; key: string; task: Task };

export type MonthSection = {
  /** 1–12 */
  month: number;
  title: string;
  data: YearItem[];
};

/**
 * Tolv måneder med denne måneden først (november → desember → januar …).
 * I hver måned: malene først (i malenes rekkefølge), så egne oppgaver alfabetisk.
 * Måneder uten noe er med, så hele året vises (og «+» finnes for hver måned).
 */
export function groupByMonth(
  templates: TaskTemplate[],
  ownTasks: Task[],
  currentMonth: number,
): MonthSection[] {
  const own = ownTasks.filter(isOwnYearlyTask).sort((a, b) => a.title.localeCompare(b.title, 'nb'));
  return Array.from({ length: 12 }, (_, i) => {
    const month = ((currentMonth - 1 + i) % 12) + 1;
    const name = MONTH_NAMES[month - 1];
    return {
      month,
      title: name.charAt(0).toUpperCase() + name.slice(1),
      data: [
        ...templates
          .filter((t) => t.month === month)
          .map((template): YearItem => ({ kind: 'template', key: `t-${template.id}`, template })),
        ...own
          .filter((t) => t.month === month)
          .map((task): YearItem => ({ kind: 'own', key: `o-${task.id}`, task })),
      ],
    };
  });
}
