import { unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';

export type MemberBalance = Database['public']['Views']['member_balances']['Row'];
export type CompletionStatus = Database['public']['Enums']['completion_status'];

/**
 * Én linje i historikken til et barn: en avkrysning med lønn, eller en utbetaling.
 * status: venter, godkjent eller ikke godkjent (steg 10b). Ikke godkjent teller ikke.
 */
export type RewardEvent =
  | { kind: 'earned'; id: string; at: string; title: string; amount: number; status: CompletionStatus }
  | { kind: 'paid'; id: string; at: string; amount: number };

/** En avkrysning som venter på godkjenning («Til godkjenning» i «I dag»). */
export type PendingCompletion = {
  id: string;
  memberId: string;
  title: string;
  amount: number;
  completedAt: string;
};

/** Hvor mange linjer historikken viser. */
const HISTORY_LIMIT = 20;

/** Saldo for hvert barn i husstanden. Regnes ut i databasen (view member_balances). */
export async function listBalances(householdId: string): Promise<MemberBalance[]> {
  return unwrap(
    await supabase.from('member_balances').select('*').eq('household_id', householdId),
  );
}

/** Siste avkrysninger med lønn og siste utbetalinger for ett barn, nyeste først. */
export async function listRewardHistory(memberId: string): Promise<RewardEvent[]> {
  const [completions, payouts] = await Promise.all([
    supabase
      .from('task_completions')
      .select('id, completed_at, reward_nok, status, tasks(title)')
      .eq('completed_by_member_id', memberId)
      .not('reward_nok', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from('payouts')
      .select('id, paid_at, amount_nok')
      .eq('member_id', memberId)
      .order('paid_at', { ascending: false })
      .limit(HISTORY_LIMIT),
  ]);

  const earned: RewardEvent[] = unwrap(completions).map((c) => ({
    kind: 'earned',
    id: c.id,
    at: c.completed_at,
    title: c.tasks?.title ?? 'Oppgave',
    amount: c.reward_nok ?? 0,
    status: c.status,
  }));
  const paid: RewardEvent[] = unwrap(payouts).map((p) => ({
    kind: 'paid',
    id: p.id,
    at: p.paid_at,
    amount: p.amount_nok,
  }));

  return [...earned, ...paid]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, HISTORY_LIMIT);
}

/** Avkrysninger som venter på godkjenning, eldste først. RLS: bare voksne ser alle barnas. */
export async function listPendingCompletions(householdId: string): Promise<PendingCompletion[]> {
  const rows = unwrap(
    await supabase
      .from('task_completions')
      .select('id, completed_by_member_id, completed_at, reward_nok, tasks(title)')
      .eq('household_id', householdId)
      .eq('status', 'pending')
      .order('completed_at', { ascending: true }),
  );
  return rows.map((c) => ({
    id: c.id,
    memberId: c.completed_by_member_id,
    title: c.tasks?.title ?? 'Oppgave',
    amount: c.reward_nok ?? 0,
    completedAt: c.completed_at,
  }));
}

/** Godkjenner én eller flere. Allerede behandlede hoppes over i databasen. */
export async function approveCompletions(completionIds: string[]): Promise<void> {
  unwrap(await supabase.rpc('approve_completions', { p_completion_ids: completionIds }));
}

/**
 * «Ikke godkjent»: beløpet trekkes, og oppgaven regnes som ikke gjort. Var det siste
 * avkrysning, settes fristen tilbake og en engangsjobb blir ledig igjen (i databasen).
 */
export async function rejectCompletion(completionId: string): Promise<void> {
  unwrap(await supabase.rpc('reject_completion', { p_completion_id: completionId }));
}

/** En voksen registrerer at barnet har fått pengene. Maks godkjent saldo (sjekkes i databasen). */
export async function recordPayout(memberId: string, amountNok: number): Promise<void> {
  unwrap(await supabase.rpc('record_payout', { p_member_id: memberId, p_amount_nok: amountNok }));
}
