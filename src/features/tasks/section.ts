import { isSeasonal } from './recurrence';
import type { Recurrence } from './types';

// Hvilket segment i «Oppgaver» en oppgave (eller mal) står i: «Hverdag» eller «Årshjul».
// Én regel, så alle oppgaver havner i nøyaktig ett av dem.

export type TaskSection = 'everyday' | 'year';

type SectionFields = Pick<
  Recurrence,
  'recurrence_type' | 'recurrence_unit' | 'recurrence_every' | 'season_start_month'
>;

/** Korteste intervall (ca. 3 måneder) som står i Årshjul, per enhet. År er alltid langt nok. */
const LONG_INTERVAL_MIN: Record<'day' | 'week' | 'month', number> = { day: 90, week: 13, month: 3 };

/** «Etter sist utført» med minst ca. 3 måneder mellom: 90 dager, 13 uker, 3 måneder eller år. */
export function isLongInterval(r: Pick<SectionFields, 'recurrence_type' | 'recurrence_unit' | 'recurrence_every'>): boolean {
  if (r.recurrence_type !== 'interval' || r.recurrence_unit === null) return false;
  if (r.recurrence_unit === 'year') return true;
  return (r.recurrence_every ?? 1) >= LONG_INTERVAL_MIN[r.recurrence_unit];
}

/**
 * Årshjul: årlige oppgaver, sesongoppgaver (alle typer) og lange intervaller.
 * Hverdag: alt annet, også engangsoppgaver langt fram i tid og ledige jobber.
 */
export function taskSection(r: SectionFields): TaskSection {
  if (r.recurrence_type === 'once' || r.recurrence_type === 'job') return 'everyday';
  if (isSeasonal(r)) return 'year';
  if (r.recurrence_type === 'calendar' && r.recurrence_unit === 'year') return 'year';
  return isLongInterval(r) ? 'year' : 'everyday';
}
