import { unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import type { PreparednessRow } from './types';

/** Husstandens svar. Alle i husstanden kan lese (RLS), også barn. */
export async function listPreparedness(householdId: string): Promise<PreparednessRow[]> {
  return unwrap(
    await supabase.from('preparedness_items').select('*').eq('household_id', householdId),
  );
}

/**
 * Lagrer svaret på én vare (upsert på husstand + nøkkel). Bare voksne (RLS). En dato krever
 * status «have» (check i databasen), så den fjernes her når varen ikke er på plass.
 */
export async function setPreparednessItem(row: PreparednessRow): Promise<void> {
  const expires_on = row.status === 'have' ? row.expires_on : null;
  unwrap(
    await supabase
      .from('preparedness_items')
      .upsert({ ...row, expires_on }, { onConflict: 'household_id,item_key' }),
  );
}
