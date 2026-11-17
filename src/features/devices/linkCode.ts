// Koden som kobler barnets enhet til barneprofilen (steg 10a).
// Samme alfabet og normalisering som invitasjonskoder, men gjelder bare i 10 minutter.
// QR-koden inneholder den samme koden som en lenke, så skann og inntasting gir samme resultat.
import { INVITE_CODE_LENGTH, normalizeInviteCode } from '../household/inviteCode';

export const LINK_CODE_LENGTH = INVITE_CODE_LENGTH;

/** 'ABCDEFGH' → 'mittansvar://link?code=ABCDEFGH' (innholdet i QR-koden). */
export function linkCodeUrl(code: string): string {
  return `mittansvar://link?code=${code}`;
}

/**
 * Leser koden fra en skannet QR-kode eller fra det barnet tastet inn.
 * Gir null hvis det ikke blir nøyaktig 8 gyldige tegn.
 */
export function parseLinkCode(input: string): string | null {
  const match = input.match(/[?&]code=([^&#]+)/);
  const raw = match ? decodeURIComponent(match[1]) : input;
  const code = normalizeInviteCode(raw);
  return code.length === LINK_CODE_LENGTH ? code : null;
}

/** Hele minutter og sekunder igjen, f.eks. «9:05». 0:00 når tiden er ute. */
export function formatTimeLeft(expiresAt: string, now: number): string {
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  const s = seconds % 60;
  return `${Math.floor(seconds / 60)}:${s < 10 ? '0' : ''}${s}`;
}
