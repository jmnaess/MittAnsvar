import type { Member } from '../household/types';
import type { TodayTask } from '../tasks/types';

/** Hva et trykk i «I dag» skal gjøre. */
export type CompletionAction =
  | { kind: 'direct'; memberId: string }
  | { kind: 'pick'; members: Member[]; preselectedId: string | null }
  | { kind: 'none' };

type TaskLike = Pick<TodayTask, 'recurrence_type' | 'assigned_member_id' | 'reward_nok'>;

/**
 * Avgjør hvem som gjorde oppgaven når noen trykker på den i «I dag».
 *
 * - Barn krysser alltid av for seg selv på jobber. Ellers som før: den ansvarlige, eller meg.
 * - Voksen, åpen jobb: velg hvilket av barna som gjorde den.
 * - Voksen, oppgave med lønn som er tildelt et barn: velg barnet (forhåndsvalgt) eller meg.
 *   Ellers kunne barnet fått betalt for noe en voksen gjorde.
 * - Alt annet: ett trykk, den ansvarlige gjorde det. Felles oppgave: den som trykker.
 */
export function chooseCompletionAction(
  task: TaskLike,
  me: Member | undefined,
  members: Member[],
): CompletionAction {
  if (!me) return { kind: 'none' };
  const isJob = task.recurrence_type === 'job';
  const assigned = members.find((m) => m.id === task.assigned_member_id);

  if (me.role === 'child') {
    return { kind: 'direct', memberId: isJob ? me.id : (task.assigned_member_id ?? me.id) };
  }

  if (isJob && !assigned) {
    const children = members.filter((m) => m.role === 'child');
    if (children.length > 0) return { kind: 'pick', members: children, preselectedId: null };
    return { kind: 'direct', memberId: me.id };
  }

  if (task.reward_nok && assigned?.role === 'child') {
    return { kind: 'pick', members: [assigned, me], preselectedId: assigned.id };
  }

  return { kind: 'direct', memberId: assigned?.id ?? task.assigned_member_id ?? me.id };
}
