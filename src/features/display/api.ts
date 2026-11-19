import { ApiError, unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import type { LinkCode } from '../devices/api';
import type { FamilyBoard, HouseholdDisplay } from './types';

/**
 * Familieskjermen. Se docs/ARCHITECTURE.md §3.
 * Skjermen er en anonym bruker uten medlemskap. Alt den leser, kommer fra get_family_board.
 */

/** Tavla for denne enheten, eller null hvis enheten ikke er en koblet familieskjerm. */
export async function getFamilyBoard(): Promise<FamilyBoard | null> {
  const board = unwrap(await supabase.rpc('get_family_board'));
  return board as unknown as FamilyBoard | null;
}

/** En voksen lager en kode. Gjelder i 10 minutter og kan brukes én gang. */
export async function createDisplayLinkCode(householdId: string): Promise<LinkCode> {
  const rows = unwrap(
    await supabase.rpc('create_display_link_token', { p_household_id: householdId }),
  );
  const row = rows[0];
  if (!row) throw new ApiError('empty_result', 500, 'empty_result');
  return { code: row.code, expiresAt: row.expires_at };
}

/** Skjermene som er koblet til husstanden, eldste først. RLS: bare voksne ser dem. */
export async function listDisplays(householdId: string): Promise<HouseholdDisplay[]> {
  return unwrap(
    await supabase
      .from('household_displays')
      .select('id, created_at')
      .eq('household_id', householdId)
      .order('created_at'),
  );
}

/** En voksen kobler fra. Den anonyme brukeren slettes, og skjermen logger seg ut. */
export async function unlinkDisplay(displayId: string): Promise<void> {
  unwrap(await supabase.rpc('unlink_display', { p_display_id: displayId }));
}
