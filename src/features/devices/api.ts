import { ApiError, unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import { signOutLocal } from '../auth/api';

/**
 * Barnets enhet (steg 10a). Se docs/ARCHITECTURE.md §3.
 * Barnet får en anonym Supabase-bruker. Koden kobler den til barneprofilen, og etter det
 * gjelder de samme RLS-reglene som overalt ellers.
 */

export type LinkCode = { code: string; expiresAt: string };

/** En voksen lager en kode for et barn. Gjelder i 10 minutter og kan brukes én gang. */
export async function createLinkCode(memberId: string): Promise<LinkCode> {
  const rows = unwrap(await supabase.rpc('create_link_token', { p_member_id: memberId }));
  const row = rows[0];
  if (!row) throw new ApiError('empty_result', 500, 'empty_result');
  return { code: row.code, expiresAt: row.expires_at };
}

/**
 * «Jeg er et barn» og «Sett opp familieskjerm»: logger inn uten e-post. Koden avgjør senere hva
 * enheten blir. Sesjonen lagres i SecureStore som vanlig.
 */
export async function signInAsDevice(): Promise<void> {
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

/**
 * Barnets enhet løser inn koden. Databasen gir null for feil, utløpt og brukt kode
 * (se migrasjonen *_child_devices.sql). Det gjør vi om til én feil, så vi ikke røper hvilken.
 */
export async function redeemLinkCode(code: string): Promise<void> {
  const householdId = unwrap(await supabase.rpc('redeem_link_token', { p_code: code }));
  if (!householdId) throw new ApiError('link_invalid', 400, 'P0001');
}

/**
 * «Logg ut av denne enheten» på barnets enhet. Kobler fra seg selv (den anonyme brukeren slettes
 * på serveren), og logger så ut lokalt. En vanlig utlogging ville latt profilen stå koblet til
 * en bruker ingen kan logge inn som igjen.
 */
export async function signOutChildDevice(): Promise<void> {
  unwrap(await supabase.rpc('unlink_my_device'));
  await signOutLocal();
}

/** En voksen kobler fra. Den anonyme brukeren slettes, og barnet logges ut. */
export async function unlinkDevice(memberId: string): Promise<void> {
  unwrap(await supabase.rpc('unlink_member_device', { p_member_id: memberId }));
}
