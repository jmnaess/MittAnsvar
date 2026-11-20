import { ApiError, unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';

/** Tekstgruppen complete_task valgte ut fra (docs/DATABASE.md §4). Styrer feiringen for barn. */
export type FeedbackKind = 'regular' | 'day_done' | 'young';

export type CompletionResult = {
  completionId: string;
  /** null hvis det ikke finnes noen tekst som passer tonen og målgruppen. */
  feedbackText: string | null;
  nextDueOn: string | null;
  /** Lønnen som ble tjent. null = ingen lønn, eller en voksen gjorde oppgaven. */
  rewardNok: number | null;
  /** «pending» når et barn ga seg selv lønn på egen enhet: venter på godkjenning (steg 10b). */
  pending: boolean;
  /** Voksne får alltid regular. */
  feedbackKind: FeedbackKind;
};

/**
 * Krysser av en oppgave. Serveren setter dato, beregner neste frist og velger tilbakemelding.
 * memberId er den som gjorde oppgaven (kan være et barn, når en voksen krysser av for det).
 * lastToday: oppgaven var den siste i barnets «I dag». Gir en egen feiring og egne tekster.
 */
export async function completeTask(
  taskId: string,
  memberId: string,
  lastToday = false,
): Promise<CompletionResult> {
  const rows = unwrap(
    await supabase.rpc('complete_task', {
      p_task_id: taskId,
      p_member_id: memberId,
      p_last_today: lastToday,
    }),
  );
  const row = rows[0];
  // RPC-en returnerer alltid én rad når den lykkes. Dette er bare et sikkerhetsnett.
  if (!row) throw new ApiError('empty_result', 500, 'empty_result');
  return toCompletionResult(row);
}

/** Raden fra complete_task (også via add_own_task) slik appen bruker den. */
export function toCompletionResult(row: CompleteTaskRow): CompletionResult {
  return {
    completionId: row.completion_id,
    feedbackText: row.feedback_text ?? null,
    nextDueOn: row.next_due_on ?? null,
    rewardNok: row.reward_nok ?? null,
    pending: row.status === 'pending',
    feedbackKind: toFeedbackKind(row.feedback_kind),
  };
}

type CompleteTaskRow = Database['public']['Functions']['complete_task']['Returns'][number];

/** En database som er eldre enn appen, sender ikke feedback_kind. */
function toFeedbackKind(kind: string | null | undefined): FeedbackKind {
  return kind === 'day_done' || kind === 'young' ? kind : 'regular';
}

/** Angrer en avkrysning (bare den siste på oppgaven, innen 10 minutter). Fristen går tilbake. */
export async function undoCompletion(completionId: string): Promise<void> {
  unwrap(await supabase.rpc('undo_completion', { p_completion_id: completionId }));
}

/**
 * «Ikke gjort» (bare voksne, avkrysninger fra i dag, uten tidsgrense). Raden slettes. Var den
 * den siste på oppgaven, går fristen tilbake og en engangsjobb blir ledig igjen.
 */
export async function removeCompletion(completionId: string): Promise<void> {
  unwrap(await supabase.rpc('remove_completion', { p_completion_id: completionId }));
}

/**
 * «Endre hvem som gjorde det» (bare voksne, avkrysninger fra i dag). Et barn får beløpet godkjent,
 * en voksen får ingen lønn. Jobber kan bare flyttes til barn jobben gjelder.
 */
export async function reassignCompletion(completionId: string, memberId: string): Promise<void> {
  unwrap(
    await supabase.rpc('reassign_completion', {
      p_completion_id: completionId,
      p_member_id: memberId,
    }),
  );
}

/** En avkrysning fra i dag (viewet today_completions), med tittel og ansvarlig fra oppgaven. */
export type TodayCompletion = Database['public']['Views']['today_completions']['Row'];

/** En avkrysning fra i går til for tre dager siden (viewet recent_completions). */
export type RecentCompletion = Database['public']['Views']['recent_completions']['Row'];

/**
 * Avkrysninger de tre siste dagene (ikke i dag), uten avviste. RLS gjør at barn bare ser sine
 * egne. Til «Gjort siste 3 dager» i personvisningen.
 */
export async function listRecentCompletions(householdId: string): Promise<RecentCompletion[]> {
  return unwrap(
    await supabase
      .from('recent_completions')
      .select('*')
      .eq('household_id', householdId)
      .order('completed_at', { ascending: false }),
  );
}

/**
 * Dagens avkrysninger i husstandens tidssone, uten avviste. RLS gjør at barn bare ser sine egne.
 * Eldste først, så de står i den rekkefølgen de ble gjort.
 */
export async function listTodayCompletions(householdId: string): Promise<TodayCompletion[]> {
  return unwrap(
    await supabase
      .from('today_completions')
      .select('*')
      .eq('household_id', householdId)
      .order('completed_at'),
  );
}
