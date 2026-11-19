import { addDays, formatDate, formatWeekRange, isoWeekNumber, lastDayOfMonth, startOfIsoWeek } from '../../lib/dates';
import type { Occurrence, Task } from './types';

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
export type UpcomingItem = { key: string; task: Task; dueOn: string; checkable: boolean };

/** En hyppig oppgave, vist én gang («Hver dag») med neste dato. checkable som over. */
export type RepeatingItem = { task: Task; nextOn: string; checkable: boolean };

/** «Denne uken», «Neste uke» eller «Uke 50 · 7.–13. des.». */
export type UpcomingGroup = { key: string; title: string; items: UpcomingItem[] };

/**
 * nextMonth: årlige månedsoppgaver (årshjulet) i neste kalendermåned. De har ingen dag, så de
 * vises samlet under «Neste måned» i stedet for på den 1. i måneden.
 */
export type MemberUpcoming = { repeating: RepeatingItem[]; groups: UpcomingGroup[]; nextMonth: UpcomingItem[] };

export const EMPTY_UPCOMING: MemberUpcoming = { repeating: [], groups: [], nextMonth: [] };

/** Månedsoppgave: årlig kalenderoppgave uten dag (som private.is_month_task i databasen). */
export function isMonthTask(task: Pick<Task, 'recurrence_type' | 'recurrence_unit' | 'month_day'>): boolean {
  return task.recurrence_type === 'calendar' && task.recurrence_unit === 'year' && task.month_day === null;
}

/**
 * Forekomsten er en hel måned, ikke en dato. En utsatt månedsoppgave har fått en fast dato
 * (postponed_to), og den vises som en vanlig rad på datoen.
 */
function isMonthOccurrence(task: Task, dueOn: string): boolean {
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
function isDaily(task: Task): boolean {
  return task.recurrence_unit === 'day' && task.recurrence_every === 1;
}

/**
 * Kan forekomsten krysses av tidlig fra «Kommende»? Bare den nærmeste, altså den som er
 * oppgavens frist (next_due_on). Står oppgaven i «I dag» (frist i dag eller forfalt), er ingen
 * kommende forekomst lik fristen, og man krysser av i «I dag» som vanlig.
 * Daglige oppgaver aldri: morgendagens forekomst gjør man ikke i dag.
 */
export function canCompleteEarly(task: Task, dueOn: string): boolean {
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
 * (barnets egen visning og «Alle»). Månedsoppgaver i neste måned legges i nextMonth, og
 * månedsoppgaver lenger fram utelates (de kommer med når de blir neste måned). Resten
 * grupperes per ISO-uke, sortert på dato og tittel.
 */
export function buildUpcoming(
  occurrences: Occurrence[],
  tasks: Task[],
  memberId: string | null,
  today: string,
  { windowDays, hideFrequent = false }: { windowDays: number; hideFrequent?: boolean },
): MemberUpcoming {
  const taskById = new Map(
    tasks
      .filter((t) => t.recurrence_type !== 'job' && (memberId === null || t.assigned_member_id === memberId))
      .map((t) => [t.id, t]),
  );
  const nextMonth = nextMonthKey(today);
  const monthItems: UpcomingItem[] = [];

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

  const repeating: RepeatingItem[] = [];
  const items: UpcomingItem[] = [];
  for (const [taskId, dates] of datesByTask) {
    const task = taskById.get(taskId)!;
    const sorted = [...dates].sort();
    if (isFrequent(sorted.length, windowDays)) {
      if (!hideFrequent) {
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

  const groups: UpcomingGroup[] = [];
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
