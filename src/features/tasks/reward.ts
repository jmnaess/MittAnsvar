// Lønn per oppgave (steg 9). Hele kroner. Samme grense som check-constrainten på tasks.reward_nok.

export const MAX_REWARD_NOK = 10000;

/**
 * Feltet «Lønn (kr)» → kolonnen. Tom tekst = ingen lønn (null).
 * undefined betyr ugyldig (0, for stort eller ikke et tall), så skjemaet ikke kan lagres.
 */
export function parseReward(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const n = Number(trimmed);
  return n >= 1 && n <= MAX_REWARD_NOK ? n : undefined;
}

/**
 * Lønnen som lagres på en oppgave. Årshjul-oppgaver har aldri lønn, uansett hvem som har ansvaret,
 * så beløpet (også et ugyldig et) teller ikke da. Ellers som parseReward.
 */
export function taskReward(text: string, { yearly }: { yearly: boolean }): number | null | undefined {
  return yearly ? null : parseReward(text);
}

/** 10 → «10 kr». */
export function formatKroner(amount: number): string {
  return `${amount} kr`;
}
