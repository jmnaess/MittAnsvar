import { MONTH_NAMES } from '../../lib/dates';
import type { Household } from '../household/types';
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

export type MonthSection = {
  /** 1–12 */
  month: number;
  title: string;
  data: TaskTemplate[];
};

/**
 * Tolv måneder med denne måneden først (november → desember → januar …).
 * Måneder uten maler er med, så hele året vises.
 */
export function groupByMonth(templates: TaskTemplate[], currentMonth: number): MonthSection[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = ((currentMonth - 1 + i) % 12) + 1;
    const name = MONTH_NAMES[month - 1];
    return {
      month,
      title: name.charAt(0).toUpperCase() + name.slice(1),
      data: templates.filter((t) => t.month === month),
    };
  });
}
