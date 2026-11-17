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

/** 10 → «10 kr». */
export function formatKroner(amount: number): string {
  return `${amount} kr`;
}
