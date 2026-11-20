import type { TodayCompletion } from '../completions/api';
import { doneSectionKey, SHARED_KEY } from '../completions/doneToday';
import type { Member } from '../household/types';
import { taskSection } from './section';
import type { TodayTask } from './types';

/** Feltene grupperingen bruker. Familieskjermen får ikke hele raden. */
type GroupableTask = Pick<
  TodayTask,
  'assigned_member_id' | 'is_month_task' | 'is_overdue' | 'recurrence_type'
>;

export type TodaySection<T = TodayTask, M = Member> = {
  key: string;
  title: string;
  /** null for «Felles». */
  member: M | null;
  data: T[];
  /** Det som er gjort i dag og hører til seksjonen. Vises nederst, som utført. */
  done: TodayCompletion[];
};

export const THIS_MONTH_KEY = 'this-month';
export const JOBS_KEY = 'jobs';

/**
 * Grupperer «I dag» per medlem (i samme rekkefølge som medlemslisten), så «Felles», så
 * «Ekstrajobber», og til slutt «Denne måneden» for månedsoppgaver (årshjulet) som ikke er
 * forfalt. De kan gjøres når som helst i måneden, så de ligger nederst.
 * Jobber ligger bare i sin egen seksjon, også når de er for ett bestemt barn. Forfalte månedsoppgaver ligger hos
 * personen, som vanlige forfalte oppgaver. Tomme seksjoner vises ikke, unntatt «Ekstrajobber»
 * når showEmptyJobs er satt (for voksne, så de ser hvor de legger ut jobber). En oppgave med et
 * ukjent medlem havner i «Felles».
 *
 * done: dagens avkrysninger. De legges i personens kort eller «Felles» (se doneSectionKey), og
 * en person med bare utførte oppgaver får likevel et kort.
 *
 * showAllMembers: alle personer får kort, også uten oppgaver (familieskjermen).
 */
export function groupTodayByMember<T extends GroupableTask, M extends Pick<Member, 'id' | 'display_name'>>(
  allTasks: T[],
  members: M[],
  {
    showEmptyJobs = false,
    showAllMembers = false,
    done = [],
  }: { showEmptyJobs?: boolean; showAllMembers?: boolean; done?: TodayCompletion[] } = {},
): TodaySection<T, M>[] {
  const known = new Set(members.map((m) => m.id));
  const doneIn = (key: string) => done.filter((c) => doneSectionKey(c, known) === key);
  const isThisMonth = (t: T) => !!t.is_month_task && !t.is_overdue;
  const isJob = (t: T) => t.recurrence_type === 'job';
  const tasks = allTasks.filter((t) => !isThisMonth(t) && !isJob(t));

  const sections: TodaySection<T, M>[] = members.map((member) => ({
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
    key: JOBS_KEY,
    title: 'Ekstrajobber',
    member: null,
    data: allTasks.filter(isJob),
    done: [],
  });
  sections.push({
    key: THIS_MONTH_KEY,
    title: 'Denne måneden',
    member: null,
    data: allTasks.filter(isThisMonth),
    done: [],
  });

  return sections.filter(
    (s) =>
      s.data.length > 0 ||
      s.done.length > 0 ||
      (showEmptyJobs && s.key === JOBS_KEY) ||
      (showAllMembers && s.member !== null),
  );
}

/** Feltene personvisningen trenger: ansvarlig, og det taskSection bruker. */
type FocusTask = Pick<
  TodayTask,
  'assigned_member_id' | 'recurrence_type' | 'recurrence_unit' | 'recurrence_every' | 'season_start_month'
>;

/** Felles årshjul-oppgave: uten ansvarlig, og i segmentet «Årshjul» (se section.ts). */
export function isSharedYearTask(t: FocusTask): boolean {
  return t.assigned_member_id === null && taskSection(t) === 'year';
}

/**
 * Personvisning (én person valgt i FamilyStrip): personens kort, og «Denne måneden» med bare
 * personens egne oppgaver (hvis noen). Brukes i voksnes «I dag» og på familieskjermen.
 *
 * includeShared (når personen er voksen, aldri barn): felles årshjul-oppgaver kommer også med.
 * De med frist i dag eller forfalt legges sist i personens kort (fra «Felles»), og felles
 * månedsoppgaver i «Denne måneden». Personens kort må finnes i all for å få dem (showAllMembers).
 */
export function focusSections<T extends FocusTask, M>(
  all: TodaySection<T, M>[],
  memberId: string,
  { includeShared = false }: { includeShared?: boolean } = {},
): TodaySection<T, M>[] {
  const ownCard = all.find((s) => s.key === memberId);
  const sharedYear = includeShared
    ? (all.find((s) => s.key === SHARED_KEY)?.data.filter(isSharedYearTask) ?? [])
    : [];
  const own = ownCard ? [{ ...ownCard, data: [...ownCard.data, ...sharedYear] }] : [];
  const month = all.find((s) => s.key === THIS_MONTH_KEY);
  const ownMonth =
    month?.data.filter(
      (t) => t.assigned_member_id === memberId || (includeShared && t.assigned_member_id === null),
    ) ?? [];
  return month && ownMonth.length > 0 ? [...own, { ...month, data: ownMonth }] : own;
}

/**
 * Personvisningen: en felles rad i personens eget kort krysses av for personen, uten spørsmål.
 * null = vanlig regel (personens egne rader, «Felles», «Denne måneden» og «Ekstrajobber»).
 */
export function cardDoerId(
  section: { member: { id: string } | null },
  task: Pick<TodayTask, 'assigned_member_id'>,
): string | null {
  return section.member && task.assigned_member_id === null ? section.member.id : null;
}
