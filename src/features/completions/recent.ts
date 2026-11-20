import { addDays, weekdayName } from '../../lib/dates';
import type { RecentCompletion } from './api';

/** Én dag i «Gjort siste 3 dager». key er datoen. */
export type RecentDay = { key: string; title: string; items: RecentCompletion[] };

/**
 * Det personen har gjort de tre siste dagene, gruppert per dag: «I går», så ukedag («Mandag»).
 * Nyeste dag først, og nyeste avkrysning først innen dagen. Filtrerer på hvem som gjorde det,
 * så en ekstrajobb havner hos den som tok den. Viewet har allerede tatt bort i dag og avviste.
 */
export function groupRecentByDay(
  completions: RecentCompletion[],
  memberId: string,
  today: string,
): RecentDay[] {
  const yesterday = addDays(today, -1);
  const mine = completions
    .filter((c) => c.completed_by_member_id === memberId && c.completed_on)
    .sort(
      (a, b) =>
        b.completed_on!.localeCompare(a.completed_on!) ||
        (b.completed_at ?? '').localeCompare(a.completed_at ?? ''),
    );

  const days: RecentDay[] = [];
  for (const c of mine) {
    const date = c.completed_on!;
    const last = days[days.length - 1];
    if (last?.key === date) last.items.push(c);
    else days.push({ key: date, title: date === yesterday ? 'I går' : weekdayName(date), items: [c] });
  }
  return days;
}
