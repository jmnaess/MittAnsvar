import { addDays, startOfIsoWeek } from '../../lib/dates';
import type { Member } from '../household/types';
import { formatKroner } from '../tasks/reward';

/** Tilstanden til kortet: noe igjen, alt gjort, eller ingen oppgaver i dag. */
export type HeroState = 'progress' | 'allDone' | 'empty';

/** open = åpne oppgaver i «Mine oppgaver i dag», done = dagens utførte der. */
export function heroState(open: number, done: number): HeroState {
  if (open + done === 0) return 'empty';
  return open === 0 ? 'allDone' : 'progress';
}

/** Hilsen etter enhetens klokke: 05–11 morgen, 12–17 ettermiddag, ellers kveld. */
export function greetingFor(hour: number, name: string): string {
  const part = hour >= 5 && hour < 12 ? 'God morgen' : hour >= 12 && hour < 18 ? 'God ettermiddag' : 'God kveld';
  return `${part}, ${name}!`;
}

/** «2 av 5 i dag». */
export function todayProgressText(open: number, done: number): string {
  return `${done} av ${open + done} i dag`;
}

/** Til skjermleseren på ringen: «2 av 5 oppgaver gjort i dag». */
export function progressA11yLabel(open: number, done: number): string {
  return `${done} av ${open + done} oppgaver gjort i dag`;
}

/**
 * 5 år og yngre får en enklere variant. Samme regel som feiringen «young» i databasen.
 * Uten fødselsår: vanlig variant.
 */
export function isYoungChild(member: Pick<Member, 'birth_year'>, year: number): boolean {
  return member.birth_year !== null && year - member.birth_year <= 5;
}

/** Uka (mandag–søndag) som inneholder datoen. */
export function weekRange(today: string): { monday: string; sunday: string } {
  const monday = startOfIsoWeek(today);
  return { monday, sunday: addDays(monday, 6) };
}

/** Det ukeberegningen trenger fra en avkrysning. */
export type WeekCompletion = { reward_nok: number | null; status: 'pending' | 'approved' | 'rejected' };

export type WeekStats = { count: number; earnedNok: number };

/**
 * Antall gjort og tjent denne uka. Avviste regnes som ikke gjort. Tjent = godkjent + venter,
 * samme tall som saldoen viser (earnedLabel).
 */
export function weekStats(rows: WeekCompletion[]): WeekStats {
  const counted = rows.filter((r) => r.status !== 'rejected');
  return {
    count: counted.length,
    earnedNok: counted.reduce((sum, r) => sum + (r.reward_nok ?? 0), 0),
  };
}

/** «Denne uka: 12 oppgaver gjort · 85 kr tjent». Uten lønn bare antall. Ingenting gjort: undefined. */
export function weekText(stats: WeekStats): string | undefined {
  if (stats.count === 0) return undefined;
  const done = `${stats.count} ${stats.count === 1 ? 'oppgave' : 'oppgaver'} gjort`;
  const earned = stats.earnedNok > 0 ? ` · ${formatKroner(stats.earnedNok)} tjent` : '';
  return `Denne uka: ${done}${earned}`;
}

/**
 * Hardt mellomrom før siste ord, så setningen aldri slutter med ett ord alene på en linje
 * («… får ansvar for / mer.» blir «… får ansvar / for mer.»).
 */
export function noWidow(text: string): string {
  const i = text.lastIndexOf(' ');
  return i === -1 ? text : `${text.slice(0, i)} ${text.slice(i + 1)}`;
}
