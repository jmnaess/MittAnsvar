import { ApiError, unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';
import { type CompletionResult, toCompletionResult } from '../completions/api';

type Functions = Database['public']['Functions'];

/** Barnets eget forslag, som venter eller ble avgjort de siste 3 dagene. */
export type MyProposal = Functions['list_my_task_proposals']['Returns'][number];

/** Et forslag som venter på en voksen («I dag»). */
export type PendingProposal = {
  id: string;
  memberId: string;
  title: string;
  is_done: boolean;
  wants_reward: boolean;
  proposed_nok: number | null;
  createdAt: string;
};

/** Et forslag med lønn. Uten lønn brukes addOwnTask (ingen godkjenning). */
export type ProposalInput = {
  title: string;
  isDone: boolean;
  /** Valgfritt beløp barnet ønsker. null = «La de voksne foreslå». */
  proposedNok: number | null;
};

/** Barnet sender et forslag med lønn. Grensene (tittel, beløp, 5 som venter) sjekkes i databasen. */
export async function submitProposal(input: ProposalInput): Promise<void> {
  unwrap(
    await supabase.rpc('submit_task_proposal', {
      p_title: input.title,
      p_is_done: input.isDone,
      p_wants_reward: true,
      // Utelatt = null i databasen.
      p_proposed_nok: input.proposedNok ?? undefined,
    }),
  );
}

export type OwnTaskInput = { title: string; isDone: boolean };

/**
 * Barnet legger inn noe uten lønn, uten godkjenning. Ikke gjort: en engangsoppgave til barnet i
 * dag. Gjort: registreres som utført av barnet med en gang, og completion brukes til feiringen.
 * Grensene (tittel, 10 per dag, innstillingen) sjekkes i databasen.
 */
export async function addOwnTask(
  input: OwnTaskInput,
): Promise<{ taskId: string; completion: CompletionResult | null }> {
  const rows = unwrap(
    await supabase.rpc('add_own_task', { p_title: input.title, p_is_done: input.isDone }),
  );
  const row = rows[0];
  if (!row) throw new ApiError('empty_result', 500, 'empty_result');
  return { taskId: row.task_id, completion: row.completion_id ? toCompletionResult(row) : null };
}

/** Barnets egne forslag, nyeste først. Barn leser bare via denne RPC-en. */
export async function listMyProposals(): Promise<MyProposal[]> {
  return unwrap(await supabase.rpc('list_my_task_proposals'));
}

/** Forslag som venter, eldste først. RLS: bare voksne ser dem. */
export async function listPendingProposals(householdId: string): Promise<PendingProposal[]> {
  const rows = unwrap(
    await supabase
      .from('task_proposals')
      .select('id, member_id, title, is_done, wants_reward, proposed_nok, created_at')
      .eq('household_id', householdId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  );
  return rows.map((p) => ({
    id: p.id,
    memberId: p.member_id,
    title: p.title,
    is_done: p.is_done,
    wants_reward: p.wants_reward,
    proposed_nok: p.proposed_nok,
    createdAt: p.created_at,
  }));
}

/**
 * Godkjenn (med beløp, 0 = ingen lønn) eller avslå. Godkjent og gjort registreres som utført av
 * barnet. Godkjent og ikke gjort blir en engangsoppgave til barnet i dag. Alt skjer i databasen.
 */
export async function decideProposal(
  id: string,
  approve: boolean,
  amountNok: number | null = null,
): Promise<void> {
  unwrap(
    await supabase.rpc('decide_task_proposal', {
      p_proposal_id: id,
      p_approve: approve,
      p_amount_nok: amountNok ?? undefined,
    }),
  );
}
