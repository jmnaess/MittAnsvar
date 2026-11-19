// «Hvem har ansvaret?» med flervalg. Ren logikk, så den kan testes uten React Native.
import type { Member } from '../household/types';
import type { TaskInput } from './types';

/** ChoiceChips trenger en verdi for «Felles». null kan ikke brukes som nøkkel. */
export const SHARED = 'shared';

/**
 * Nytt utvalg etter et trykk. «Felles» er et eget valg som fjerner de andre, og velges en
 * person, fjernes «Felles». Tomt utvalg blir «Felles», så noe alltid er valgt.
 */
export function nextAssignees(prev: string[], next: string[]): string[] {
  const sharedAdded = next.includes(SHARED) && !prev.includes(SHARED);
  if (sharedAdded) return [SHARED];
  const people = next.filter((id) => id !== SHARED);
  return people.length > 0 ? people : [SHARED];
}

/** Knappen i personvisningen i «I dag», f.eks. «+ Ny oppgave til Leah». */
export function newTaskForLabel(name: string): string {
  return `+ Ny oppgave til ${name}`;
}

/**
 * Forhåndsvalget i «Oppgave i dag». memberId kommer fra ruteparameteren, som expo-router kan gi
 * som liste. Uten person starter skjemaet på «Felles».
 */
export function initialAssignees(memberId: string | string[] | undefined): string[] {
  const id = Array.isArray(memberId) ? memberId[0] : memberId;
  return id ? [id] : [SHARED];
}

/** Er alle valgte voksne? Da skjules lønn (voksne får aldri lønn). «Felles» kan gjøres av barn. */
export function allAdults(assignees: string[], members: Member[]): boolean {
  return (
    assignees.length > 0 &&
    assignees.every((id) => members.some((m) => m.id === id && m.role === 'adult'))
  );
}

/**
 * Én oppgave per valgt person, med samme tittel, gjentakelse, dato og lønn. «Felles» gir én
 * oppgave uten ansvarlig. En voksen får aldri lønn, så beløpet fjernes på den voksnes oppgave.
 */
export function toTaskInputs(
  base: Omit<TaskInput, 'assigned_member_id'>,
  assignees: string[],
  members: Member[],
): TaskInput[] {
  return assignees.map((id) => {
    const isAdult = members.some((m) => m.id === id && m.role === 'adult');
    return {
      ...base,
      assigned_member_id: id === SHARED ? null : id,
      reward_nok: isAdult ? null : base.reward_nok,
    };
  });
}

/** Hintet under «Hvem har ansvaret?» når barna er tatt bort fordi oppgaven blir en årsoppgave. */
export const YEARLY_ADULTS_HINT = 'Årsoppgaver er for voksne, så barna kan ikke velges her.';

/**
 * Kan personen ha en årsoppgave (Årshjul)? Voksne og «Felles». keepId er den som allerede har en
 * eksisterende årsoppgave. Den vises fortsatt som valgt, også om det er et barn.
 */
export function canHaveYearlyTask(id: string, members: Pick<Member, 'id' | 'role'>[], keepId: string | null): boolean {
  return id === SHARED || id === keepId || members.some((m) => m.id === id && m.role === 'adult');
}

/**
 * Utvalget som lagres. Blir oppgaven en årsoppgave, fjernes barna (unntatt keepId). Er ingen igjen,
 * blir det «Felles». Ellers uendret. Valget i skjemaet beholdes, så barna kommer tilbake hvis
 * gjentakelsen endres tilbake.
 */
export function allowedAssignees(
  assignees: string[],
  members: Pick<Member, 'id' | 'role'>[],
  rule: { yearly: boolean; keepId: string | null },
): string[] {
  if (!rule.yearly) return assignees;
  const kept = assignees.filter((id) => canHaveYearlyTask(id, members, rule.keepId));
  return kept.length > 0 ? kept : [SHARED];
}
