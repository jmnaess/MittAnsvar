import type { TodayTask } from '../tasks/types';
import { isSharedYearTask } from '../tasks/groupToday';
import { jobMembers } from '../tasks/job';
import type { BoardMember } from './types';

export type BoardAction =
  | { kind: 'direct'; memberId: string }
  | { kind: 'pick'; members: BoardMember[] }
  | { kind: 'none' };

type TaskLike = Pick<
  TodayTask,
  | 'recurrence_type'
  | 'assigned_member_id'
  | 'job_member_ids'
  | 'recurrence_unit'
  | 'recurrence_every'
  | 'season_start_month'
>;

/**
 * Hvem et trykk på familieskjermen gjelder. Samme regler som complete_task for skjermen:
 * - oppgave med ansvarlig: den ansvarlige, med ett trykk (også i «Denne måneden»),
 * - felles oppgave: velg blant alle,
 * - felles årshjul-oppgave (isSharedYearTask): velg blant de voksne, aldri barna,
 * - jobb: velg blant barna jobben gjelder.
 * Er det bare én å velge, krysses det av med en gang.
 */
export function chooseBoardDoer(task: TaskLike, members: BoardMember[]): BoardAction {
  const isJob = task.recurrence_type === 'job';
  const assigned = isJob ? undefined : members.find((m) => m.id === task.assigned_member_id);
  if (assigned) return { kind: 'direct', memberId: assigned.id };

  const candidates = isJob
    ? jobMembers(task.job_member_ids ?? [], members)
    : isSharedYearTask(task)
      ? members.filter((m) => m.role === 'adult')
      : members;
  if (candidates.length === 0) return { kind: 'none' };
  if (candidates.length === 1) return { kind: 'direct', memberId: candidates[0].id };
  return { kind: 'pick', members: candidates };
}
