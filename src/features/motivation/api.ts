import { unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import type { WeekCompletion } from './heroCard';

/**
 * Barnets avkrysninger fra mandag til søndag (completed_on er i husstandens tidssone), uten
 * avviste. RLS: barnet leser bare sine egne rader i task_completions, så ingen migrasjon trengs.
 */
export async function listWeekCompletions(
  memberId: string,
  monday: string,
  sunday: string,
): Promise<WeekCompletion[]> {
  return unwrap(
    await supabase
      .from('task_completions')
      .select('reward_nok, status')
      .eq('completed_by_member_id', memberId)
      .gte('completed_on', monday)
      .lte('completed_on', sunday)
      .neq('status', 'rejected'),
  );
}
