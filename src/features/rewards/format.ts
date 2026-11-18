import { formatKroner } from '../tasks/reward';

/** Det som trengs for å vise saldoen. Kolonnene kommer fra viewet member_balances. */
export type BalanceAmounts = {
  /** Godkjent − utbetalt: det som kan betales ut. */
  balance_nok: number | null;
  /** Venter på godkjenning (barnet krysset av på egen enhet). */
  pending_nok: number | null;
};

/**
 * Saldoen slik barnet og de voksne ser den (steg 10b). Det som venter, er med i tallet, så
 * barnet ser saldoen øke med én gang: «35 kr (10 kr venter)» = 25 godkjent + 10 venter.
 * Bare de 25 kan betales ut.
 */
export function formatBalance(b: BalanceAmounts | undefined): string {
  const payable = b?.balance_nok ?? 0;
  const pending = b?.pending_nok ?? 0;
  const total = formatKroner(payable + pending);
  return pending > 0 ? `${total} (${formatKroner(pending)} venter)` : total;
}

/**
 * Teksten i overskriften til et barn i «I dag»: «35 kr tjent». Samme tall som formatBalance
 * (godkjent + venter). undefined når barnet ikke har noe til gode, så ingenting vises.
 */
export function earnedLabel(b: BalanceAmounts | undefined): string | undefined {
  const total = (b?.balance_nok ?? 0) + (b?.pending_nok ?? 0);
  return total > 0 ? `${formatKroner(total)} tjent` : undefined;
}
