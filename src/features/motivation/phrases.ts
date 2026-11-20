/**
 * Dagens setning på barnets kort øverst i «I dag». Korte, varme setninger om ansvar, omsorg og
 * fellesskap, uten preking (docs/VISJON.md). Rekkefølgen er fast: én setning per dag.
 */
export const DAILY_PHRASES = [
  'Små ting betyr mye.',
  'Takk for at du tenker på de andre.',
  'Det du gjør, gjør hjemmet bedre for alle.',
  'Alt dere vil at andre skal gjøre mot dere, skal dere gjøre mot dem.',
  'Alle tar sin del.',
  'Sammen får vi det til.',
  'Et hjem er noe vi lager sammen.',
  'Når du hjelper til, merker de andre det.',
  'Litt hver dag blir mye til slutt.',
  'Du er viktig her hjemme.',
  'Ingen oppgave er for liten.',
  'Vær snille mot hverandre.',
  'Det er fint å hjelpe uten å bli spurt.',
  'Når alle hjelper til, blir det mer tid til moro.',
  'Den som er tro i det små, får ansvar for mer.',
  'Det er godt når vi kan stole på hverandre.',
  'Takk for at du er med.',
  'Hjemme hjelper vi hverandre.',
  'Hjelp hverandre med det som er tungt.',
  'Hver dag er en ny sjanse til å hjelpe.',
  'Det føles godt å gjøre noe for andre.',
  'Spør gjerne om noen trenger en hånd.',
  'Du gjør en forskjell.',
  'Vi er et lag.',
  'Det du gjør i dag, gleder noen i morgen.',
  'Ting går lettere når vi gjør dem sammen.',
  'Å si takk er også å bry seg.',
  'Godt å ha deg her.',
] as const;

/** Dager siden 1. januar 1970 for en kalenderdato ('YYYY-MM-DD'). */
function dayNumber(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/**
 * Setningen for en dag. Samme hele dagen og for alle barna, og ingen kommer igjen før hele
 * lista er brukt. Ikke tilfeldig per åpning.
 */
export function phraseForDate(isoDate: string): string {
  const n = DAILY_PHRASES.length;
  return DAILY_PHRASES[((dayNumber(isoDate) % n) + n) % n];
}
