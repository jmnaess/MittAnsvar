import type { TodayCompletion } from './api';

/** Hvor lenge en avkrysning kan angres. Samme grense som undo_completion i databasen. */
export const UNDO_WINDOW_MS = 10 * 60 * 1000;

/** Seksjonen i «I dag» for oppgaver uten ansvarlig. Samme nøkkel som i groupToday.ts. */
export const SHARED_KEY = 'shared';

/**
 * Hvilken seksjon en utført oppgave hører til:
 * - den ansvarlige personens kort,
 * - ledige jobber (ingen ansvarlig) hos den som tok jobben,
 * - ellers «Felles» (også når den ansvarlige ikke finnes lenger).
 */
export function doneSectionKey(c: TodayCompletion, memberIds: Set<string>): string {
  if (c.assigned_member_id && memberIds.has(c.assigned_member_id)) return c.assigned_member_id;
  if (c.recurrence_type === 'job' && memberIds.has(c.completed_by_member_id)) {
    return c.completed_by_member_id;
  }
  return SHARED_KEY;
}

/** «Gjort av Leah» når en annen enn den ansvarlige gjorde det. I «Felles» alltid. */
export function doneByText(
  c: TodayCompletion,
  sectionKey: string,
  nameOf: (memberId: string) => string | undefined,
): string | undefined {
  if (sectionKey === c.completed_by_member_id) return undefined;
  const name = nameOf(c.completed_by_member_id);
  return name ? `Gjort av ${name}` : undefined;
}

/**
 * Kan avkrysningen angres med et trykk? Samme regler som undo_completion: den siste på oppgaven,
 * innen 10 minutter, og barn bare det de selv har registrert.
 */
export function canUndo(
  c: TodayCompletion,
  { now, isAdult, userId }: { now: number; isAdult: boolean; userId: string | undefined },
): boolean {
  if (!c.is_latest) return false;
  if (now - new Date(c.completed_at).getTime() > UNDO_WINDOW_MS) return false;
  return isAdult || (!!userId && c.recorded_by === userId);
}
