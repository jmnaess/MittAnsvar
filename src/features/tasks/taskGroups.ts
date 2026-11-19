import { formatDate, formatMonthYear, lastDayOfMonth } from '../../lib/dates';
import type { Member } from '../household/types';
import { type Category, CATEGORIES, toCategory } from './categories';
import { jobMembers } from './job';
import { isPostponed } from './postpone';
import { formatKroner } from './reward';
import { describeRecurrence, isJob, isMonthTask } from './recurrence';
import type { Task } from './types';

// Gruppering, filtrering, søk og sortering for «Oppgaver». Ren logikk, testes med Jest.

/** Det grupperingen trenger fra en oppgave. */
export type GroupTask = Pick<
  Task,
  'id' | 'title' | 'category' | 'assigned_member_id' | 'recurrence_type' | 'job_member_ids'
>;

type GroupMember = Pick<Member, 'id' | 'role'>;

export type GroupMode = 'category' | 'person';

export type TaskGroup<T, M> =
  | { key: string; kind: 'category'; category: Category; tasks: T[] }
  | { key: string; kind: 'member'; member: M; tasks: T[] }
  | { key: string; kind: 'shared'; tasks: T[] }
  | { key: string; kind: 'jobs'; tasks: T[] };

export const SHARED_GROUP_KEY = 'person:shared';
export const JOBS_GROUP_KEY = 'person:jobs';
const categoryKey = (category: Category) => `category:${category.key}`;
const memberKey = (memberId: string) => `person:${memberId}`;

/** Det man søker på: små bokstaver, uten mellomrom i endene. */
function normalize(text: string): string {
  return text.trim().toLocaleLowerCase('nb-NO');
}

/** Tittelen inneholder søketeksten, uten forskjell på store og små bokstaver. Tomt søk = alle. */
export function matchesSearch(task: Pick<Task, 'title'>, query: string): boolean {
  const q = normalize(query);
  return q === '' || normalize(task.title).includes(q);
}

/**
 * Oppgaven gjelder personen: den er tildelt personen, eller er en jobb personen kan ta.
 * null = Alle. Felles oppgaver vises bare under Alle.
 */
export function matchesPerson(task: GroupTask, personId: string | null, members: GroupMember[]): boolean {
  if (personId === null) return true;
  if (isJob(task)) return jobMembers(task.job_member_ids, members).some((m) => m.id === personId);
  return task.assigned_member_id === personId;
}

export function filterTasks<T extends GroupTask>(
  tasks: T[],
  filter: { query: string; personId: string | null },
  members: GroupMember[],
): T[] {
  return tasks.filter((t) => matchesSearch(t, filter.query) && matchesPerson(t, filter.personId, members));
}

/** Alfabetisk på tittel (norsk rekkefølge, så æ, ø og å kommer sist). */
export function sortByTitle<T extends Pick<Task, 'title'>>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => a.title.localeCompare(b.title, 'nb-NO'));
}

/** Én gruppe per kategori som har oppgaver, i fast rekkefølge. */
export function groupByCategory<T extends GroupTask>(tasks: T[]): TaskGroup<T, never>[] {
  return CATEGORIES.map((category) => ({
    key: categoryKey(category),
    kind: 'category' as const,
    category,
    tasks: sortByTitle(tasks.filter((t) => toCategory(t.category).key === category.key)),
  })).filter((g) => g.tasks.length > 0);
}

/**
 * Én gruppe per person (i medlemslistens rekkefølge), så «Felles», så «Ledige jobber».
 * Bare grupper med oppgaver. En oppgave for et medlem som ikke finnes lenger, regnes som felles.
 */
export function groupByPerson<T extends GroupTask, M extends GroupMember>(
  tasks: T[],
  members: M[],
): TaskGroup<T, M>[] {
  const jobs = tasks.filter((t) => isJob(t));
  const others = tasks.filter((t) => !isJob(t));
  const known = new Set(members.map((m) => m.id));
  const groups: TaskGroup<T, M>[] = [
    ...members.map((member) => ({
      key: memberKey(member.id),
      kind: 'member' as const,
      member,
      tasks: sortByTitle(others.filter((t) => t.assigned_member_id === member.id)),
    })),
    {
      key: SHARED_GROUP_KEY,
      kind: 'shared',
      tasks: sortByTitle(others.filter((t) => !t.assigned_member_id || !known.has(t.assigned_member_id))),
    },
    { key: JOBS_GROUP_KEY, kind: 'jobs', tasks: sortByTitle(jobs) },
  ];
  return groups.filter((g) => g.tasks.length > 0);
}

/** Gruppene oppgaven havner i (én i hver visning). Åpnes når oppgaven lages eller endres. */
export function groupKeysFor(task: Pick<Task, 'category' | 'assigned_member_id' | 'recurrence_type'>): string[] {
  const person = isJob(task)
    ? JOBS_GROUP_KEY
    : task.assigned_member_id
      ? memberKey(task.assigned_member_id)
      : SHARED_GROUP_KEY;
  return [categoryKey(toCategory(task.category)), person];
}

export type OpenGroup<T, M> = { key: string; group: TaskGroup<T, M>; open: boolean };

/**
 * Gruppene til listen, hver med om den er åpen. Hver gruppe vises som ett kort.
 * allOpen: alle grupper vises åpne (mens man søker), uten å endre hvilke som er lagret som åpne.
 */
export function withOpenState<T, M>(
  groups: TaskGroup<T, M>[],
  openKeys: ReadonlySet<string>,
  allOpen = false,
): OpenGroup<T, M>[] {
  return groups.map((group) => ({ key: group.key, group, open: allOpen || openKeys.has(group.key) }));
}

/** Siste dag oppgaven kan gjøres uten å være forfalt. Samme regel som private.due_by. */
function dueBy(task: DueTask): string | null {
  if (!task.next_due_on) return null;
  return isMonthTask(task) && !isPostponed(task) ? lastDayOfMonth(task.next_due_on) : task.next_due_on;
}

type DueTask = Parameters<typeof describeRecurrence>[0] &
  Pick<Task, 'next_due_on' | 'postponed_to'>;

/** Fristen er passert. Jobber og fullførte engangsoppgaver har ingen frist. */
export function isTaskOverdue(task: DueTask, today: string): boolean {
  if (isJob(task)) return false;
  const due = dueBy(task);
  return due !== null && due < today;
}

/**
 * Undertittelen på raden: gjentakelse og neste frist.
 * «Hver uke · neste tor. 21. nov.». Engangsoppgaver: bare datoen, eller «Ferdig».
 * Jobber har ingen frist. Månedsoppgaver: «… · neste oktober 2027».
 * Forfalt: bare gjentakelsen (engangs: tom). «Forfalt» vises som merkelapp (isTaskOverdue).
 */
export function describeTaskSchedule(task: DueTask, today: string): string {
  const recurrence = describeRecurrence(task);
  if (isJob(task)) return recurrence;
  const once = task.recurrence_type === 'once';
  const due = dueBy(task);
  if (!task.next_due_on || !due) return once ? 'Ferdig' : recurrence;
  if (due < today) return once ? '' : recurrence;
  const date =
    isMonthTask(task) && !isPostponed(task) ? formatMonthYear(task.next_due_on) : formatDate(task.next_due_on);
  return once ? date : `${recurrence} · neste ${date}`;
}

// Like oppgaver for flere personer, slått sammen til én rad i Kategori-visningen.
// Bare visningen: hver person har fortsatt sin egen oppgave i databasen.

/** Det sammenslåingen trenger fra en oppgave. */
type BundleTask = GroupTask &
  DueTask &
  Pick<Task, 'template_id' | 'reward_nok'>;

/** Én rad i en gruppe: én oppgave, eller flere like oppgaver for ulike personer. */
export type TaskBundle<T> = { key: string; tasks: T[] };

/**
 * Hva som gjør oppgaver «like»: samme mal, eller uten mal samme tittel, kategori og gjentakelse.
 * Engangsoppgaver må i tillegg ha samme dato. Frist og lønn teller ellers ikke, de kan skille seg når
 * ett barn har krysset av eller får mer. null = slås aldri sammen (felles og jobber).
 */
export function sameTaskKey(task: BundleTask): string | null {
  if (isJob(task) || !task.assigned_member_id) return null;
  if (task.template_id) return `template:${task.template_id}`;
  return JSON.stringify([
    normalize(task.title),
    toCategory(task.category).key,
    task.recurrence_type,
    task.recurrence_unit,
    task.recurrence_every,
    task.weekdays,
    task.month_day,
    task.month,
    task.season_start_month,
    task.season_end_month,
    task.recurrence_type === 'once' ? task.next_due_on : null,
  ]);
}

/**
 * Slår sammen like oppgaver (sameTaskKey) til én rad. Radene står der den første av dem sto, så
 * rekkefølgen fra sortByTitle beholdes. I raden står personene i medlemslistens rekkefølge.
 * To like oppgaver for samme person slås ikke sammen.
 */
export function bundleTasks<T extends BundleTask>(
  tasks: T[],
  members: Pick<Member, 'id'>[],
): TaskBundle<T>[] {
  const bundles: TaskBundle<T>[] = [];
  const open = new Map<string, TaskBundle<T>>();
  for (const task of tasks) {
    const key = sameTaskKey(task);
    const existing = key === null ? undefined : open.get(key);
    if (existing && !existing.tasks.some((t) => t.assigned_member_id === task.assigned_member_id)) {
      existing.tasks.push(task);
      continue;
    }
    const bundle = { key: task.id, tasks: [task] };
    bundles.push(bundle);
    if (key !== null && !existing) open.set(key, bundle);
  }
  const order = (t: T) => {
    const i = members.findIndex((m) => m.id === t.assigned_member_id);
    return i === -1 ? members.length : i;
  };
  return bundles.map((b) => ({ ...b, tasks: [...b.tasks].sort((a, c) => order(a) - order(c)) }));
}

/** Hver oppgave som egen rad (Person-visningen). */
export function singleBundles<T extends Pick<Task, 'id'>>(tasks: T[]): TaskBundle<T>[] {
  return tasks.map((task) => ({ key: task.id, tasks: [task] }));
}

/** Lønn på raden: «10 kr», «10–20 kr» når den er ulik, null uten lønn. */
export function bundleReward(tasks: Pick<Task, 'reward_nok'>[]): string | null {
  const amounts = tasks.map((t) => t.reward_nok).filter((n): n is number => !!n);
  if (amounts.length === 0) return null;
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  return min === max ? formatKroner(min) : `${min}–${formatKroner(max)}`;
}

/**
 * Undertittel og «Forfalt» for en rad: nærmeste frist blant oppgavene, og forfalt hvis minst én er det.
 * Med én oppgave det samme som describeTaskSchedule og isTaskOverdue.
 */
export function bundleSchedule(tasks: DueTask[], today: string): { schedule: string; overdue: boolean } {
  const nearest = [...tasks].sort((a, b) => {
    const da = dueBy(a);
    const db = dueBy(b);
    if (da === db) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da < db ? -1 : 1;
  })[0];
  return {
    schedule: describeTaskSchedule(nearest, today),
    overdue: tasks.some((t) => isTaskOverdue(t, today)),
  };
}

/** Navnene for skjermlesere: «Leah», «Leah og Ola», «Leah, Ola og Mor». */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]}`;
}
