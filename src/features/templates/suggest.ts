import { MONTH_NAMES } from '../../lib/dates';
import type { Household } from '../household/types';
import type { Task } from '../tasks/types';
import type { TaskTemplate } from './types';

/**
 * Maler som passer husstanden: riktig husstandstype og boligtype (null = alle).
 * Bare årlige maler hører til årshjulet.
 */
export function suggestForHousehold(
  templates: TaskTemplate[],
  household: Pick<Household, 'type' | 'housing_type'>,
): TaskTemplate[] {
  return templates.filter(
    (t) =>
      t.recurrence_unit === 'year' &&
      t.month !== null &&
      (t.household_types === null || t.household_types.includes(household.type)) &&
      (t.housing_types === null || t.housing_types.includes(household.housing_type)),
  );
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
