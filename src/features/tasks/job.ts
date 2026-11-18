import type { Member } from '../household/types';
import { parseReward } from './reward';
import type { TaskInput } from './types';

/** Det korte skjemaet «Ny ledig jobb» fra «I dag». */
export type JobFormValues = {
  title: string;
  /** Barna som kan ta jobben. Tom = alle barna. */
  memberIds: string[];
  /** Tekst fra feltet «Lønn (kr)». Tom = ingen lønn. */
  reward: string;
  repeats: boolean;
};

/** Skjema → oppgave av typen ledig jobb. null når skjemaet ikke er gyldig. */
export function toJobInput(values: JobFormValues): TaskInput | null {
  const title = values.title.trim();
  const reward = parseReward(values.reward);
  if (title === '' || reward === undefined) return null;
  return {
    title,
    // Jobber bruker job_member_ids, aldri én ansvarlig (check-constraint i databasen).
    assigned_member_id: null,
    job_member_ids: values.memberIds,
    reward_nok: reward,
    recurrence_type: 'job',
    recurrence_unit: null,
    recurrence_every: null,
    weekdays: null,
    month_day: null,
    month: null,
    job_repeats: values.repeats,
    once_on: null,
  };
}

/**
 * Barna som kan ta jobben, i samme rekkefølge som medlemslisten.
 * Tom liste (eller bare ukjente id-er) betyr alle barna.
 */
export function jobMembers(jobMemberIds: string[], members: Member[]): Member[] {
  const children = members.filter((m) => m.role === 'child');
  const chosen = children.filter((m) => jobMemberIds.includes(m.id));
  return chosen.length > 0 ? chosen : children;
}

/** «Alle barna», «Leah», «Leah og Ola» eller «Leah, Ola og Emma». */
export function describeJobMembers(jobMemberIds: string[], members: Member[]): string {
  const names = members
    .filter((m) => m.role === 'child' && jobMemberIds.includes(m.id))
    .map((m) => m.display_name);
  if (names.length === 0) return 'Alle barna';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]}`;
}
