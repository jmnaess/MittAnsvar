import { parseReward } from './reward';
import type { TaskInput } from './types';

/** Det korte skjemaet «Ny årlig oppgave» fra «+» i årshjulet. */
export type YearlyFormValues = {
  title: string;
  /** null = felles. */
  assigneeId: string | null;
  /** Tekst fra feltet «Lønn (kr)». Tom = ingen lønn. */
  reward: string;
  /** 1–12. Én oppgave per måned. */
  months: number[];
};

/**
 * Skjema → én årlig månedsoppgave per valgt måned, med samme tittel, ansvarlig og lønn.
 * Månedsoppgave = én gang i året uten dag, så hele måneden er fristen (som malene i
 * årshjulet). null når skjemaet ikke er gyldig.
 */
export function toYearlyInputs(values: YearlyFormValues): TaskInput[] | null {
  const title = values.title.trim();
  const reward = parseReward(values.reward);
  if (title === '' || reward === undefined || values.months.length === 0) return null;

  const months = [...new Set(values.months)].sort((a, b) => a - b);
  return months.map((month) => ({
    title,
    assigned_member_id: values.assigneeId,
    job_member_ids: [],
    reward_nok: reward,
    recurrence_type: 'calendar',
    recurrence_unit: 'year',
    recurrence_every: 1,
    weekdays: null,
    month_day: null,
    month,
    job_repeats: false,
    once_on: null,
  }));
}
