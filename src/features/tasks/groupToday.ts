import type { TodayCompletion } from '../completions/api';
import { doneSectionKey, SHARED_KEY } from '../completions/doneToday';
import type { Member } from '../household/types';
import type { TodayTask } from './types';

export type TodaySection = {
  key: string;
  title: string;
  /** null for «Felles». */
  member: Member | null;
  data: TodayTask[];
  /** Det som er gjort i dag og hører til seksjonen. Vises nederst, som utført. */
  done: TodayCompletion[];
};

export const THIS_MONTH_KEY = 'this-month';
export const JOBS_KEY = 'jobs';

/**
 * Grupperer «I dag» per medlem (i samme rekkefølge som medlemslisten), så «Felles», så
 * «Denne måneden» for månedsoppgaver som ikke er forfalt, og til slutt «Ledige jobber».
 * Jobber ligger bare i sin egen seksjon, også når de er for ett bestemt barn. Forfalte månedsoppgaver ligger hos
 * personen, som vanlige forfalte oppgaver. Tomme seksjoner vises ikke, unntatt «Ledige jobber»
 * når showEmptyJobs er satt (for voksne, så de ser hvor de legger ut jobber). En oppgave med et
 * ukjent medlem havner i «Felles».
 *
 * done: dagens avkrysninger. De legges i personens kort eller «Felles» (se doneSectionKey), og
 * en person med bare utførte oppgaver får likevel et kort.
 */
export function groupTodayByMember(
  allTasks: TodayTask[],
  members: Member[],
  { showEmptyJobs = false, done = [] }: { showEmptyJobs?: boolean; done?: TodayCompletion[] } = {},
): TodaySection[] {
  const known = new Set(members.map((m) => m.id));
  const doneIn = (key: string) => done.filter((c) => doneSectionKey(c, known) === key);
  const isThisMonth = (t: TodayTask) => !!t.is_month_task && !t.is_overdue;
  const isJob = (t: TodayTask) => t.recurrence_type === 'job';
  const tasks = allTasks.filter((t) => !isThisMonth(t) && !isJob(t));

  const sections: TodaySection[] = members.map((member) => ({
    key: member.id,
    title: member.display_name,
    member,
    data: tasks.filter((t) => t.assigned_member_id === member.id),
    done: doneIn(member.id),
  }));
  sections.push({
    key: SHARED_KEY,
    title: 'Felles',
    member: null,
    data: tasks.filter((t) => !t.assigned_member_id || !known.has(t.assigned_member_id)),
    done: doneIn(SHARED_KEY),
  });
  sections.push({
    key: THIS_MONTH_KEY,
    title: 'Denne måneden',
    member: null,
    data: allTasks.filter(isThisMonth),
    done: [],
  });
  sections.push({
    key: JOBS_KEY,
    title: 'Ledige jobber',
    member: null,
    data: allTasks.filter(isJob),
    done: [],
  });

  return sections.filter(
    (s) => s.data.length > 0 || s.done.length > 0 || (showEmptyJobs && s.key === JOBS_KEY),
  );
}
