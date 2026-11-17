// Datoer fra databasen kommer som 'YYYY-MM-DD' (Postgres date), uten klokkeslett og tidssone.
// Vi tolker dem som kalenderdatoer. new Date('2026-11-17') ville blitt midnatt UTC, som kan
// vises som 16. november i noen tidssoner. Derfor bruker vi egne navnelister og ingen Intl.

/** ISO-rekkefølge: indeks 0 = mandag (1 i databasen) … 6 = søndag (7). */
export const WEEKDAY_NAMES = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag'];
export const WEEKDAY_SHORT = ['man.', 'tir.', 'ons.', 'tor.', 'fre.', 'lør.', 'søn.'];

/** Indeks 0 = januar (1 i databasen). */
export const MONTH_NAMES = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];
const MONTH_SHORT = [
  'jan.', 'feb.', 'mars', 'apr.', 'mai', 'juni', 'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'des.',
];

/** ISO-ukedag (1 = mandag … 7 = søndag) for en kalenderdato. */
function isoWeekday(year: number, month: number, day: number): number {
  const sundayFirst = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = søndag
  return sundayFirst === 0 ? 7 : sundayFirst;
}

/**
 * Tidspunkt (timestamptz, f.eks. '2026-11-18T13:30:00+00:00') → 'ons. 18. nov. kl. 14:30'.
 * Vises i enhetens lokale tid. Det er riktig her, fordi det er et øyeblikk og ikke en kalenderdato.
 */
export function formatDateTime(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  const weekday = WEEKDAY_SHORT[(d.getDay() + 6) % 7]; // getDay: 0 = søndag
  return `${weekday} ${d.getDate()}. ${MONTH_SHORT[d.getMonth()]} kl. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** '2026-11-17' → 'tir. 17. nov.' */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${WEEKDAY_SHORT[isoWeekday(year, month, day) - 1]} ${day}. ${MONTH_SHORT[month - 1]}`;
}
