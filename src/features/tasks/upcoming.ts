import { addDays, formatDate, formatWeekRange, isoWeekNumber, lastDayOfMonth, startOfIsoWeek } from '../../lib/dates';
import { taskSection } from './section';
import type { Occurrence, Task } from './types';

/**
 * Feltene «Kommende» bruker. Familieskjermen får bare disse (get_family_board), voksne og barn
 * hele raden.
 */
export type UpcomingTask = Pick<
  Task,
  | 'id'
  | 'title'
  | 'assigned_member_id'
  | 'reward_nok'
  | 'recurrence_type'
  | 'recurrence_unit'
  | 'recurrence_every'
  | 'weekdays'
  | 'month_day'
  | 'month'
  | 'job_repeats'
  | 'season_start_month'
  | 'season_end_month'
  | 'next_due_on'
  | 'postponed_to'
>;

/** «Kommende» for voksne, i personvisningen og i «Alle»: 8 uker fra i morgen. */
export const UPCOMING_DAYS = 56;
/** «Kommende» på barnets egen enhet: 2 uker, uten de hyppige oppgavene. */
export const CHILD_UPCOMING_DAYS = 14;

/** Vinduet til get_upcoming_occurrences: fra i morgen (i dag står allerede i kortet). */
export function upcomingWindow(today: string, days: number): { from: string; to: string } {
  return { from: addDays(today, 1), to: addDays(today, days) };
}

/**
 * En forekomst med dato. key er unik også når samme oppgave kommer flere ganger.
 * checkable: raden får sirkel og kan krysses av tidlig (se canCompleteEarly).
 */
export type UpcomingItem<T extends UpcomingTask = Task> = { key: string; task: T; dueOn: string; checkable: boolean };

/** En hyppig oppgave, vist én gang («Hver dag») med neste dato. checkable som over. */
export type RepeatingItem<T extends UpcomingTask = Task> = { task: T; nextOn: string; checkable: boolean };

/** «Denne uken», «Neste uke» eller «Uke 50 · 7.–13. des.». */
export type UpcomingGroup<T extends UpcomingTask = Task> = { key: string; title: string; items: UpcomingItem<T>[] };

/**
 * nextMonth: årlige månedsoppgaver (årshjulet) i neste kalendermåned. De har ingen dag, så de
 * vises samlet under «Neste måned» i stedet for på den 1. i måneden.
 */
export type MemberUpcoming<T extends UpcomingTask = Task> = {
  repeating: RepeatingItem<T>[];
  groups: UpcomingGroup<T>[];
  nextMonth: UpcomingItem<T>[];
};

export const EMPTY_UPCOMING: MemberUpcoming<never> = { repeating: [], groups: [], nextMonth: [] };

/** Månedsoppgave: årlig kalenderoppgave uten dag (som private.is_month_task i databasen). */
export function isMonthTask(task: Pick<Task, 'recurrence_type' | 'recurrence_unit' | 'month_day'>): boolean {
  return task.recurrence_type === 'calendar' && task.recurrence_unit === 'year' && task.month_day === null;
}

/**
 * Forekomsten er en hel måned, ikke en dato. En utsatt månedsoppgave har fått en fast dato
 * (postponed_to), og den vises som en vanlig rad på datoen.
 */
function isMonthOccurrence(task: UpcomingTask, dueOn: string): boolean {
  return isMonthTask(task) && task.postponed_to !== dueOn;
}

/** 'YYYY-MM' for måneden etter today. */
function nextMonthKey(today: string): string {
  return addDays(lastDayOfMonth(today), 1).slice(0, 7);
}

/**
 * Hyppig = i snitt minst én gang i uken i vinduet, og minst to ganger. I 8 uker betyr det
 * 8 forekomster eller flere. Da blir listen ikke lang av daglige og ukentlige oppgaver.
 */
export function isFrequent(count: number, windowDays: number): boolean {
  return count >= Math.max(2, Math.floor(windowDays / 7));
}

/** Hver dag (kalender eller intervall). */
function isDaily(task: Pick<Task, 'recurrence_unit' | 'recurrence_every'>): boolean {
  return task.recurrence_unit === 'day' && task.recurrence_every === 1;
}

/**
 * Kan forekomsten krysses av tidlig fra «Kommende»? Bare den nærmeste, altså den som er
 * oppgavens frist (next_due_on). Står oppgaven i «I dag» (frist i dag eller forfalt), er ingen
 * kommende forekomst lik fristen, og man krysser av i «I dag» som vanlig.
 * Daglige oppgaver aldri: morgendagens forekomst gjør man ikke i dag.
 */
export function canCompleteEarly(task: UpcomingTask, dueOn: string): boolean {
  return task.next_due_on === dueOn && !isDaily(task);
}

function weekTitle(monday: string, today: string): string {
  const thisWeek = startOfIsoWeek(today);
  if (monday === thisWeek) return 'Denne uken';
  if (monday === addDays(thisWeek, 7)) return 'Neste uke';
  return `Uke ${isoWeekNumber(monday)} · ${formatWeekRange(monday)}`;
}

/**
 * «Kommende» for én person (memberId), eller for hele husstanden (null: alle personer og felles).
 * Jobber er ikke med, siden de ikke har dato. Hyppige oppgaver (se isFrequent) samles i
 * repeating, én rad hver, med mindre hideFrequent er satt; da vises de ikke i det hele tatt
 * (barnets egen visning og «Alle»). hideDaily skjuler bare de daglige av dem (familieskjermen). Månedsoppgaver i neste måned legges i nextMonth, og
 * månedsoppgaver lenger fram utelates (de kommer med når de blir neste måned). Resten
 * grupperes per ISO-uke, sortert på dato og tittel.
 *
 * includeSharedYear (én voksen valgt, aldri barn): felles årshjul-oppgaver (uten ansvarlig,
 * taskSection = 'year') kommer også med.
 */
export function buildUpcoming<T extends UpcomingTask>(
  occurrences: Pick<Occurrence, 'task_id' | 'due_on'>[],
  tasks: T[],
  memberId: string | null,
  today: string,
  {
    windowDays,
    hideFrequent = false,
    hideDaily = false,
    includeSharedYear = false,
  }: { windowDays: number; hideFrequent?: boolean; hideDaily?: boolean; includeSharedYear?: boolean },
): MemberUpcoming<T> {
  const isShown = (t: T) =>
    memberId === null ||
    t.assigned_member_id === memberId ||
    (includeSharedYear && t.assigned_member_id === null && taskSection(t) === 'year');
  const taskById = new Map(
    tasks.filter((t) => t.recurrence_type !== 'job' && isShown(t)).map((t) => [t.id, t]),
  );
  const nextMonth = nextMonthKey(today);
  const monthItems: UpcomingItem<T>[] = [];

  const datesByTask = new Map<string, string[]>();
  for (const o of occurrences) {
    const task = taskById.get(o.task_id);
    if (!task) continue;
    if (isMonthOccurrence(task, o.due_on)) {
      if (o.due_on.slice(0, 7) === nextMonth) {
        monthItems.push({
          key: `${o.task_id}:${o.due_on}`,
          task,
          dueOn: o.due_on,
          checkable: canCompleteEarly(task, o.due_on),
        });
      }
      continue;
    }
    const dates = datesByTask.get(o.task_id) ?? [];
    dates.push(o.due_on);
    datesByTask.set(o.task_id, dates);
  }

  const repeating: RepeatingItem<T>[] = [];
  const items: UpcomingItem<T>[] = [];
  for (const [taskId, dates] of datesByTask) {
    const task = taskById.get(taskId)!;
    const sorted = [...dates].sort();
    if (isFrequent(sorted.length, windowDays)) {
      if (!hideFrequent && !(hideDaily && isDaily(task))) {
        repeating.push({ task, nextOn: sorted[0], checkable: canCompleteEarly(task, sorted[0]) });
      }
      continue;
    }
    for (const dueOn of sorted) {
      items.push({ key: `${taskId}:${dueOn}`, task, dueOn, checkable: canCompleteEarly(task, dueOn) });
    }
  }

  repeating.sort((a, b) => a.nextOn.localeCompare(b.nextOn) || a.task.title.localeCompare(b.task.title));
  items.sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.task.title.localeCompare(b.task.title));
  monthItems.sort((a, b) => a.task.title.localeCompare(b.task.title, 'nb'));

  const groups: UpcomingGroup<T>[] = [];
  for (const item of items) {
    const monday = startOfIsoWeek(item.dueOn);
    const last = groups[groups.length - 1];
    if (last?.key === monday) last.items.push(item);
    else groups.push({ key: monday, title: weekTitle(monday, today), items: [item] });
  }

  return { repeating, groups, nextMonth: monthItems };
}

/** 'Lør. 22. nov.' til datoen på en rad. */
export function formatUpcomingDate(isoDate: string): string {
  const text = formatDate(isoDate);
  return text.charAt(0).toUpperCase() + text.slice(1);
}
