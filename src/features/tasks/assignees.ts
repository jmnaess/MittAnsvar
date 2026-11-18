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
