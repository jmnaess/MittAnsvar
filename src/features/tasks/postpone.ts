// «Utsett til» i «I dag» og «Kommende». Datoene regnes her, men databasen sjekker dem (postpone_task).
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

/** «Neste uke» i «Når?»: mandag neste uke. Er det mandag, blir det mandagen etter. Alltid etter i dag. */
export function nextWeekDate(today: string): string {
  return addDays(today, 8 - isoWeekday(today));
}

/**
 * De faste valgene i «Utsett til», regnet fra from: i dag, eller fristen for en kommende
 * forekomst. Begge er etter from. «Velg dato» starter på nextDay.
 */
export function postponeChoices(from: string) {
  return { nextDay: addDays(from, 1), weekend: weekendDate(from) };
}

/**
 * Utsatt = fristen er datoen den ble flyttet til. Etter avkrysning har den fått ny frist, og
 * utsettelsen gjelder ikke lenger. Samme regel som private.is_postponed.
 */
export function isPostponed(task: Pick<Task, 'next_due_on' | 'postponed_to'>): boolean {
  return task.postponed_to !== null && task.postponed_to === task.next_due_on;
}
