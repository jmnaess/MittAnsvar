import { MONTH_NAMES } from '../../lib/dates';
import type { PreparednessItem } from './items';

/** '2027-03-01' → '1. mars'. Med år når datoen ikke er i år: '1. mars 2028'. */
export function formatExpiryDate(isoDate: string, today: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const base = `${day}. ${MONTH_NAMES[month - 1]}`;
  return year === Number(today.slice(0, 4)) ? base : `${base} ${year}`;
}

/** «går ut 1. mars» / «gikk ut 1. mars» (passert dato). */
export function expiryPhrase(expiresOn: string, today: string): string {
  return `${expiresOn < today ? 'gikk' : 'går'} ut ${formatExpiryDate(expiresOn, today)}`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Linjene under varen i lista: mengde, og «Trenger vi ikke» eller holdbarhet. */
export function itemMeta(item: PreparednessItem, today: string): string[] {
  const lines: string[] = [];
  if (item.amount) lines.push(item.amount);
  if (item.status === 'not_needed') lines.push('Trenger vi ikke');
  else if (item.status === 'have' && item.expiresOn) lines.push(capitalize(expiryPhrase(item.expiresOn, today)));
  return lines;
}

/** Raden i «I dag»: «Bytt ut: Ved (går ut 1. mars)». */
export function replaceTitle(item: PreparednessItem, today: string): string {
  return `Bytt ut: ${item.title} (${expiryPhrase(item.expiresOn!, today)})`;
}

/** Kortet i Årshjul: «14 av 22 på plass · 1 går snart ut». */
export function summaryText(progress: { have: number; total: number }, expiring: number): string {
  const base = `${progress.have} av ${progress.total} på plass`;
  return expiring > 0 ? `${base} · ${expiring} går snart ut` : base;
}
