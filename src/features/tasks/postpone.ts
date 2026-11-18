// «Utsett til» i «I dag». Datoene regnes her, men databasen sjekker dem (postpone_task).
// Se docs/DATABASE.md §2 (Utsettelse).

import { addDays } from '../../lib/dates';
import type { Task } from './types';

/** ISO-ukedag (1 = mandag … 7 = søndag) for 'YYYY-MM-DD'. */
function isoWeekday(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  const sundayFirst = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = søndag
  return sundayFirst === 0 ? 7 : sundayFirst;
}

/**
 * «Til helga»: førstkommende lørdag. Er det lørdag, blir det søndag. Er det søndag, neste lørdag.
 * Alltid etter i dag.
 */
export function weekendDate(today: string): string {
  const weekday = isoWeekday(today);
  if (weekday === 6) return addDays(today, 1);
  if (weekday === 7) return addDays(today, 6);
  return addDays(today, 6 - weekday);
}

/** De faste valgene i «Utsett til». «Velg dato» starter på i morgen. */
export function postponeChoices(today: string) {
  return { tomorrow: addDays(today, 1), weekend: weekendDate(today) };
}

/**
 * Utsatt = fristen er datoen den ble flyttet til. Etter avkrysning har den fått ny frist, og
 * utsettelsen gjelder ikke lenger. Samme regel som private.is_postponed.
 */
export function isPostponed(task: Pick<Task, 'next_due_on' | 'postponed_to'>): boolean {
  return task.postponed_to !== null && task.postponed_to === task.next_due_on;
}
