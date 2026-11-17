import { ApiError, unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';

export type CompletionResult = {
  completionId: string;
  /** null hvis det ikke finnes noen tekst som passer tonen og målgruppen. */
  feedbackText: string | null;
  nextDueOn: string | null;
  /** Lønnen som ble tjent. null = ingen lønn, eller en voksen gjorde oppgaven. */
  rewardNok: number | null;
};

/**
 * Krysser av en oppgave. Serveren setter dato, beregner neste frist og velger tilbakemelding.
 * memberId er den som gjorde oppgaven (kan være et barn, når en voksen krysser av for det).
 */
export async function completeTask(taskId: string, memberId: string): Promise<CompletionResult> {
  const rows = unwrap(
    await supabase.rpc('complete_task', { p_task_id: taskId, p_member_id: memberId }),
  );
  const row = rows[0];
  // RPC-en returnerer alltid én rad når den lykkes. Dette er bare et sikkerhetsnett.
  if (!row) throw new ApiError('empty_result', 500, 'empty_result');
  return {
    completionId: row.completion_id,
    feedbackText: row.feedback_text ?? null,
    nextDueOn: row.next_due_on ?? null,
    rewardNok: row.reward_nok ?? null,
  };
}

/** Angrer en avkrysning (bare den siste på oppgaven, innen 10 minutter). Fristen går tilbake. */
export async function undoCompletion(completionId: string): Promise<void> {
  unwrap(await supabase.rpc('undo_completion', { p_completion_id: completionId }));
}
