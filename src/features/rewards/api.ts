import { unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';

export type MemberBalance = Database['public']['Views']['member_balances']['Row'];
export type CompletionStatus = Database['public']['Enums']['completion_status'];

/**
 * Én linje i historikken til et barn: en avkrysning med lønn, ekstra lønn fra en voksen, eller
 * en utbetaling. status: venter, godkjent eller ikke godkjent (steg 10b). Ikke godkjent teller ikke.
 */
export type RewardEvent =
  | { kind: 'earned'; id: string; at: string; title: string; amount: number; status: CompletionStatus }
  | { kind: 'extra'; id: string; at: string; amount: number; reason: string | null }
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

/** Siste avkrysninger med lønn, ekstra lønn og utbetalinger for ett barn, nyeste først. */
export async function listRewardHistory(memberId: string): Promise<RewardEvent[]> {
  const [completions, extras, payouts] = await Promise.all([
    supabase
      .from('task_completions')
      .select('id, completed_at, reward_nok, status, tasks(title)')
      .eq('completed_by_member_id', memberId)
      .not('reward_nok', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from('extra_rewards')
      .select('id, created_at, amount_nok, reason')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
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
  const extra: RewardEvent[] = unwrap(extras).map((x) => ({
    kind: 'extra',
    id: x.id,
    at: x.created_at,
    amount: x.amount_nok,
    reason: x.reason,
  }));
  const paid: RewardEvent[] = unwrap(payouts).map((p) => ({
    kind: 'paid',
    id: p.id,
    at: p.paid_at,
    amount: p.amount_nok,
  }));

  return [...earned, ...extra, ...paid]
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

/**
 * Endre godkjenning i ettertid (godkjent ↔ ikke godkjent). Fristen og en engangsjobb følger
 * med når det er den siste avkrysningen. Et beløp som er betalt ut, kan trekkes (gir forskudd,
 * appen spør først). Alt sjekkes i databasen.
 */
export async function setCompletionStatus(
  completionId: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  unwrap(
    await supabase.rpc('set_completion_status', { p_completion_id: completionId, p_status: status }),
  );
}

/**
 * En voksen registrerer at barnet har fått pengene. 1–10 000 kr. Over saldoen blir det et
 * forskudd (sjekkes i databasen).
 */
export async function recordPayout(memberId: string, amountNok: number): Promise<void> {
  unwrap(await supabase.rpc('record_payout', { p_member_id: memberId, p_amount_nok: amountNok }));
}

/** Ny lønn på en godkjent avkrysning. 0 = ingen lønn (raden forsvinner fra historikken). */
export async function setCompletionReward(completionId: string, amountNok: number): Promise<void> {
  unwrap(
    await supabase.rpc('set_completion_reward', {
      p_completion_id: completionId,
      p_amount_nok: amountNok,
    }),
  );
}

/** Ekstra lønn fra en voksen (1–10 000 kr). Teller i saldoen med én gang. */
export async function addExtraReward(
  memberId: string,
  amountNok: number,
  reason: string | null,
): Promise<void> {
  unwrap(
    await supabase.rpc('add_extra_reward', {
      p_member_id: memberId,
      p_amount_nok: amountNok,
      ...(reason ? { p_reason: reason } : {}),
    }),
  );
}

/** Angre ekstra lønn. Kan gi forskudd. */
export async function deleteExtraReward(extraRewardId: string): Promise<void> {
  unwrap(await supabase.rpc('delete_extra_reward', { p_extra_reward_id: extraRewardId }));
}
