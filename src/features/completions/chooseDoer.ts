import type { Member } from '../household/types';
import { jobMembers } from '../tasks/job';
import type { TodayTask } from '../tasks/types';

/** Hva et trykk i «I dag» skal gjøre. */
export type CompletionAction =
  | { kind: 'direct'; memberId: string }
  | { kind: 'pick'; members: Member[]; preselectedId: string | null }
  | { kind: 'none' };

type TaskLike = Pick<TodayTask, 'recurrence_type' | 'assigned_member_id' | 'job_member_ids' | 'reward_nok'>;

/**
 * Avgjør hvem som gjorde oppgaven når noen trykker på den i «I dag».
 *
 * - Barn krysser alltid av for seg selv på jobber. Ellers som før: den ansvarlige, eller meg.
 * - Voksen, jobb for flere barn (eller alle): velg hvilket av dem som gjorde den.
 * - Voksen, jobb for ett barn: som en oppgave tildelt det barnet.
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

  if (me.role === 'child') {
    return { kind: 'direct', memberId: isJob ? me.id : (task.assigned_member_id ?? me.id) };
  }

  // En jobb for ett barn behandles som en oppgave tildelt barnet (under).
  const eligible = isJob ? jobMembers(task.job_member_ids ?? [], members) : [];
  if (isJob && eligible.length !== 1) {
    if (eligible.length > 1) return { kind: 'pick', members: eligible, preselectedId: null };
    return { kind: 'direct', memberId: me.id };
  }

  const assigned = isJob ? eligible[0] : members.find((m) => m.id === task.assigned_member_id);

  if (task.reward_nok && assigned?.role === 'child') {
    return { kind: 'pick', members: [assigned, me], preselectedId: assigned.id };
  }

  return { kind: 'direct', memberId: assigned?.id ?? task.assigned_member_id ?? me.id };
}
