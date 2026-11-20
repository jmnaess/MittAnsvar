import type { Member } from '../household/types';

/**
 * «Lagt inn av Leah» når et barn la inn oppgaven selv («Legg til» eller «Registrer», uten lønn).
 * Barn kan bare lage oppgaver via add_own_task, så created_by = et barn betyr nettopp det.
 * Oppgaver fra godkjente forslag har den voksne som created_by og får ingen markør.
 * Bare til de voksnes visning.
 */
export function addedByText(
  createdBy: string | null | undefined,
  members: Pick<Member, 'id' | 'role' | 'display_name'>[],
): string | undefined {
  if (!createdBy) return undefined;
  const member = members.find((m) => m.id === createdBy);
  return member?.role === 'child' ? `Lagt inn av ${member.display_name}` : undefined;
}
