import { unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import type { WeekCompletion } from './heroCard';

/** Det barnet har gjort og fått denne uka. */
export type WeekEarnings = {
  completions: WeekCompletion[];
  /** Beløpene på ekstra lønn fra en voksen. */
  extras: number[];
};

/**
 * Barnets avkrysninger fra mandag til søndag (completed_on er i husstandens tidssone), uten
 * avviste, og ekstra lønn gitt i samme uke (given_on, også husstandens dato). RLS: barnet leser
 * bare sine egne rader.
 */
export async function listWeekCompletions(
  memberId: string,
  monday: string,
  sunday: string,
): Promise<WeekEarnings> {
  const [completions, extras] = await Promise.all([
    supabase
      .from('task_completions')
      .select('reward_nok, status')
      .eq('completed_by_member_id', memberId)
      .gte('completed_on', monday)
      .lte('completed_on', sunday)
      .neq('status', 'rejected'),
    supabase
      .from('extra_rewards')
      .select('amount_nok')
      .eq('member_id', memberId)
      .gte('given_on', monday)
      .lte('given_on', sunday),
  ]);
  return {
    completions: unwrap(completions),
    extras: unwrap(extras).map((x) => x.amount_nok),
  };
}
