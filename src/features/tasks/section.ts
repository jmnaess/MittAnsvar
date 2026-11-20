import { isSeasonal } from './recurrence';
import type { Recurrence } from './types';

// Hvilket segment i «Oppgaver» en oppgave (eller mal) står i: «Hverdag» eller «Årshjul».
// Én regel, så alle oppgaver havner i nøyaktig ett av dem.

export type TaskSection = 'everyday' | 'year';

type SectionFields = Pick<
  Recurrence,
  'recurrence_type' | 'recurrence_unit' | 'recurrence_every' | 'season_start_month'
>;

/** Korteste gjentakelse (ca. 3 måneder) som står i Årshjul, per enhet. År er alltid langt nok. */
const LONG_RECURRENCE_MIN: Record<'day' | 'week' | 'month', number> = { day: 90, week: 13, month: 3 };

/**
 * Minst ca. 3 måneder mellom hver gang: 90 dager, 13 uker, 3 måneder eller år. Gjelder både
 * fast kalender (hver 3. måned) og «etter sist utført» (3 måneder etter sist).
 */
export function isLongRecurrence(r: Pick<SectionFields, 'recurrence_type' | 'recurrence_unit' | 'recurrence_every'>): boolean {
  if (r.recurrence_type !== 'calendar' && r.recurrence_type !== 'interval') return false;
  if (r.recurrence_unit === null) return false;
  if (r.recurrence_unit === 'year') return true;
  return (r.recurrence_every ?? 1) >= LONG_RECURRENCE_MIN[r.recurrence_unit];
}

/**
 * Årshjul: årlige oppgaver, sesongoppgaver (alle typer) og lange gjentakelser (kalender eller
 * intervall). Hverdag: alt annet, også engangsoppgaver langt fram i tid og ekstrajobber.
 * Samme regel i get_family_board (se paritetstesten i section.test.ts).
 */
export function taskSection(r: SectionFields): TaskSection {
  if (r.recurrence_type === 'once' || r.recurrence_type === 'job') return 'everyday';
  if (isSeasonal(r)) return 'year';
  return isLongRecurrence(r) ? 'year' : 'everyday';
}
