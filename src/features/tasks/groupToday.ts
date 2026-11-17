import type { Member } from '../household/types';
import type { TodayTask } from './types';

export type TodaySection = {
  key: string;
  title: string;
  /** null for «Felles». */
  member: Member | null;
  data: TodayTask[];
};

/**
 * Grupperer «I dag» per medlem (i samme rekkefølge som medlemslisten), og til slutt «Felles».
 * Medlemmer uten oppgaver i dag vises ikke. En oppgave med et ukjent medlem havner i «Felles».
 */
export function groupTodayByMember(tasks: TodayTask[], members: Member[]): TodaySection[] {
  const known = new Set(members.map((m) => m.id));

  const sections: TodaySection[] = members.map((member) => ({
    key: member.id,
    title: member.display_name,
    member,
    data: tasks.filter((t) => t.assigned_member_id === member.id),
  }));
  sections.push({
    key: 'shared',
    title: 'Felles',
    member: null,
    data: tasks.filter((t) => !t.assigned_member_id || !known.has(t.assigned_member_id)),
  });

  return sections.filter((s) => s.data.length > 0);
}
