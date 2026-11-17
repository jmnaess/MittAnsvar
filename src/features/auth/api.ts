import { supabase } from '../../lib/supabase';
import { clearReminders } from '../notifications/schedule';

/** Sender en 6-sifret kode til e-posten. Lager brukeren hvis den ikke finnes. */
export async function sendCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

/** Bytter koden mot en sesjon. Sesjonen lagres automatisk i SecureStore. */
export async function verifyCode(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw error;
}

/** Planlagte påminnelser fjernes, så neste som logger inn på telefonen ikke får dem. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  await clearReminders();
}

/**
 * Sletter kontoen via Edge Function delete-account (data i databasen + auth-brukeren).
 * supabase-js legger ved brukerens token automatisk.
 * Etterpå tømmes sesjonen lokalt; brukeren finnes ikke lenger på serveren.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' });
  await clearReminders();
}
