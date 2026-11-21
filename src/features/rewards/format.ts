import { formatKroner } from '../tasks/reward';

/** Det som trengs for å vise saldoen. Kolonnene kommer fra viewet member_balances. */
export type BalanceAmounts = {
  /** Godkjent + ekstra lønn − utbetalt. Under 0 = forskudd. */
  balance_nok: number | null;
  /** Venter på godkjenning (barnet krysset av på egen enhet). */
  pending_nok: number | null;
};

/** Det som vises: godkjent + venter, så barnet ser saldoen øke med én gang. */
function shownTotal(b: BalanceAmounts | undefined): number {
  return (b?.balance_nok ?? 0) + (b?.pending_nok ?? 0);
}

/** Barnet har fått mer enn det har tjent (også når det som venter, er regnet med). */
export function isAdvance(b: BalanceAmounts | undefined): boolean {
  return shownTotal(b) < 0;
}

/**
 * Saldoen slik barnet og de voksne ser den. Det som venter, er med i tallet: «35 kr (10 kr
 * venter)» = 25 godkjent + 10 venter. Bare de 25 kan betales ut. Under 0 er det et forskudd,
 * og det vises aldri med minus: «Forskudd: 30 kr».
 */
export function formatBalance(b: BalanceAmounts | undefined): string {
  const pending = b?.pending_nok ?? 0;
  const total = shownTotal(b);
  const amount = total < 0 ? `Forskudd: ${formatKroner(-total)}` : formatKroner(total);
  return pending > 0 ? `${amount} (${formatKroner(pending)} venter)` : amount;
}

/** Raden i «Husstand»: «Opptjent: 35 kr» eller «Forskudd: 30 kr». */
export function balanceLine(b: BalanceAmounts | undefined): string {
  return isAdvance(b) ? formatBalance(b) : `Opptjent: ${formatBalance(b)}`;
}

/** Forklaringen under et forskudd. isSelf: på barnets egen enhet. */
export function advanceNote(name: string, isSelf: boolean): string {
  return `Det ${isSelf ? 'du' : name} tjener, går først til å betale ned forskuddet.`;
}

/**
 * Teksten i overskriften til et barn i «I dag»: «35 kr tjent». Samme tall som formatBalance.
 * undefined når barnet ikke har noe til gode (også ved forskudd), så ingenting vises.
 */
export function earnedLabel(b: BalanceAmounts | undefined): string | undefined {
  const total = shownTotal(b);
  return total > 0 ? `${formatKroner(total)} tjent` : undefined;
}

/**
 * Forskuddet etter at `reduction` kr trekkes (eller betales ut), eller null hvis det ikke gir
 * forskudd. Regnes fra godkjent saldo, som er det databasen teller: det som venter, kan bli
 * avvist.
 */
export function advanceAfter(b: BalanceAmounts | undefined, reduction: number): number | null {
  if (reduction <= 0) return null;
  const after = (b?.balance_nok ?? 0) - reduction;
  return after < 0 ? -after : null;
}

/**
 * Bekreftelsen før lønn som er betalt ut, trekkes: «Lønnen for denne er betalt ut. Dette gir
 * Leah et forskudd på 30 kr.» Har barnet forskudd fra før: «… Forskuddet blir 30 kr.».
 */
export function advanceWarning(name: string, advance: number, alreadyAdvance: boolean): string {
  return `Lønnen for denne er betalt ut. ${advanceText(name, advance, alreadyAdvance)}`;
}

/** «Dette gir Leah et forskudd på 30 kr.», eller «Forskuddet blir 30 kr.» når det finnes et fra før. */
export function advanceText(name: string, advance: number, alreadyAdvance: boolean): string {
  return alreadyAdvance
    ? `Forskuddet blir ${formatKroner(advance)}.`
    : `Dette gir ${name} et forskudd på ${formatKroner(advance)}.`;
}

/** Tittelen på ekstra lønn i historikken: begrunnelsen, eller «Ekstra lønn». */
export function extraRewardTitle(reason: string | null | undefined): string {
  return reason?.trim() || 'Ekstra lønn';
}

/** Skjermlesertekst for ekstra lønn: «+50 kr · Ekstra for at du hjalp Thelma». */
export function extraRewardText(amount: number, reason: string | null | undefined): string {
  return `+${formatKroner(amount)} · ${extraRewardTitle(reason)}`;
}

/**
 * Bekreftelsen som trengs før `reduction` kr trekkes fra barnet, eller null når det ikke gir
 * forskudd. Brukes av «Ikke godkjent», «Ikke gjort», «Endre hvem» og nedjustert beløp.
 */
export function advanceWarningFor(
  b: BalanceAmounts | undefined,
  name: string,
  reduction: number,
): string | null {
  const advance = advanceAfter(b, reduction);
  if (advance === null) return null;
  return advanceWarning(name, advance, (b?.balance_nok ?? 0) < 0);
}
