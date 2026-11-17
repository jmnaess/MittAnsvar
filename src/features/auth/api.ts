import type { AuthError } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

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

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Gjør Supabase-feil om til korte norske meldinger. */
export function toNorwegianMessage(error: unknown): string {
  const authError = error as Partial<AuthError> | undefined;
  switch (authError?.code) {
    case 'otp_expired':
      return 'Koden er feil eller utløpt. Prøv igjen, eller be om en ny kode.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'For mange forsøk. Vent litt og prøv igjen.';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'E-postadressen ser ikke riktig ut.';
    case 'signup_disabled':
      return 'Nye brukere kan ikke registrere seg akkurat nå.';
  }
  if (authError?.status === 0 || authError?.name === 'AuthRetryableFetchError') {
    return 'Fikk ikke kontakt med serveren. Sjekk nettet og prøv igjen.';
  }
  return 'Noe gikk galt. Prøv igjen.';
}
