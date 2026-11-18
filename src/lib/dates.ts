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

/** '2026-11-01' → 'november' */
export function monthName(isoDate: string): string {
  return MONTH_NAMES[Number(isoDate.split('-')[1]) - 1];
}

/** '2026-11-01' → 'november 2026' */
export function formatMonthYear(isoDate: string): string {
  return `${monthName(isoDate)} ${isoDate.split('-')[0]}`;
}

/** '2026-12-01' → '1. desember 2026' */
export function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day}. ${MONTH_NAMES[month - 1]} ${year}`;
}

// ---------------------------------------------------------------------------
// Regning med kalenderdatoer ('YYYY-MM-DD'). UTC brukes bare som regnestykke, så sommertid
// og enhetens tidssone ikke påvirker resultatet.
// ---------------------------------------------------------------------------

function fromUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** '2026-12-30' + 3 → '2027-01-02' */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return fromUtc(new Date(Date.UTC(year, month - 1, day + days)));
}

/** '2028-02-10' → '2028-02-29' */
export function lastDayOfMonth(isoDate: string): string {
  const [year, month] = isoDate.split('-').map(Number);
  return fromUtc(new Date(Date.UTC(year, month, 0))); // dag 0 i neste måned = siste dag i denne
}

/** '2026-11-17' → '2026-11-01' */
export function firstDayOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

/** Enhetens lokale kalenderdato for et tidspunkt. Påminnelser går etter klokken på mobilen. */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Millisekunder til neste midnatt i enhetens lokale tid (for å hente «I dag» på nytt). */
export function msUntilNextMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

/** '2026-11-17' → 'tir. 17. nov.' */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${WEEKDAY_SHORT[isoWeekday(year, month, day) - 1]} ${day}. ${MONTH_SHORT[month - 1]}`;
}

/** '2026-11-18' → 'Onsdag 18. november' (overskriften i «I dag»). */
export function formatWeekdayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const weekday = WEEKDAY_NAMES[isoWeekday(year, month, day) - 1];
  return `${weekday[0].toUpperCase()}${weekday.slice(1)} ${day}. ${MONTH_NAMES[month - 1]}`;
}
