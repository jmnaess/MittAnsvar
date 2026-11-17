// Invitasjonskoder: 8 tegn uten 0/O og 1/I/L. Lages av databasen (create_invite).
// Samme normalisering som private.normalize_invite_code i migrasjonen *_invites.sql.

export const INVITE_CODE_LENGTH = 8;

/** ' abcd-efgh ' → 'ABCDEFGH'. Fjerner alt som ikke kan være i en kode. */
export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^ABCDEFGHJKMNPQRSTUVWXYZ2-9]/g, '');
}

/** 'ABCDEFGH' → 'ABCD-EFGH', lettere å lese og skrive av. */
export function formatInviteCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** Teksten som deles via delingsmenyen (SMS, Messenger …). */
export function inviteShareMessage(householdName: string, code: string): string {
  return [
    `Bli med i husstanden «${householdName}» i MittAnsvar!`,
    '',
    '1. Last ned MittAnsvar fra App Store eller Google Play.',
    '2. Logg inn med e-postadressen din.',
    `3. Velg «Bli med i en husstand» og skriv inn koden: ${formatInviteCode(code)}`,
    '',
    'Koden gjelder i 48 timer og kan brukes én gang.',
  ].join('\n');
}
