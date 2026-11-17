import type { Member } from '../household/types';
import type { TodayTask } from './types';

export type TodaySection = {
  key: string;
  title: string;
  /** null for «Felles». */
  member: Member | null;
  data: TodayTask[];
};

export const THIS_MONTH_KEY = 'this-month';

/**
 * Grupperer «I dag» per medlem (i samme rekkefølge som medlemslisten), så «Felles», og til slutt
 * «Denne måneden» for månedsoppgaver som ikke er forfalt. Forfalte månedsoppgaver ligger hos
 * personen, som vanlige forfalte oppgaver. Tomme seksjoner vises ikke. En oppgave med et ukjent
 * medlem havner i «Felles».
 */
export function groupTodayByMember(allTasks: TodayTask[], members: Member[]): TodaySection[] {
  const known = new Set(members.map((m) => m.id));
  const isThisMonth = (t: TodayTask) => !!t.is_month_task && !t.is_overdue;
  const tasks = allTasks.filter((t) => !isThisMonth(t));

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
  sections.push({
    key: THIS_MONTH_KEY,
    title: 'Denne måneden',
    member: null,
    data: allTasks.filter(isThisMonth),
  });

  return sections.filter((s) => s.data.length > 0);
}
