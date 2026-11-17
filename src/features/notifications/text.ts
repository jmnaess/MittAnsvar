// Teksten i den daglige påminnelsen. Rene funksjoner, testes i __tests__/text.test.ts.

/** Flere titler enn dette blir til «og 3 til», så varselet ikke blir for langt. */
export const MAX_TITLES = 4;

/** «den 1.» (start) eller «siste uke» (det som fortsatt ikke er gjort). */
export type MonthLine = { kind: 'start' | 'last-week'; titles: string[] };

export type ReminderContent = {
  /** Oppgaver som forfaller denne dagen. */
  due: string[];
  /** Antall forfalte oppgaver. */
  overdueCount: number;
  /** Månedsoppgaver, bare den 1. og i siste uke. */
  month: MonthLine | null;
};

/** ['A', 'B', 'C', 'D', 'E', 'F'] → 'A, B, C, D og 2 til' */
export function listTitles(titles: string[], max = MAX_TITLES): string {
  if (titles.length <= max) return titles.join(', ');
  return `${titles.slice(0, max).join(', ')} og ${titles.length - max} til`;
}

function overdueOnly(count: number): string {
  return count === 1 ? '1 forfalt oppgave venter' : `${count} forfalte oppgaver venter`;
}

/**
 * «I dag: Søppel, Rense sluk + 2 forfalt», eventuelt med en linje for månedsoppgaver.
 * Gir null når det ikke er noe å si. Da sendes ikke noe varsel den dagen.
 */
export function formatReminderBody({ due, overdueCount, month }: ReminderContent): string | null {
  const lines: string[] = [];

  if (due.length > 0) {
    const overdue = overdueCount > 0 ? ` + ${overdueCount} forfalt` : '';
    lines.push(`I dag: ${listTitles(due)}${overdue}`);
  } else if (overdueCount > 0) {
    lines.push(overdueOnly(overdueCount));
  }

  if (month && month.titles.length > 0) {
    const label = month.kind === 'start' ? 'Denne måneden' : 'Fortsatt denne måneden';
    lines.push(`${label}: ${listTitles(month.titles)}`);
  }

  return lines.length > 0 ? lines.join('\n') : null;
}
