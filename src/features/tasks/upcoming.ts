import { addDays, formatDate, formatWeekRange, isoWeekNumber, startOfIsoWeek } from '../../lib/dates';
import type { Occurrence, Task } from './types';

/** «Kommende» for voksne og i personvisningen: 8 uker fra i morgen. */
export const UPCOMING_DAYS = 56;
/** «Kommende» på barnets egen enhet: 2 uker, uten de hyppige oppgavene. */
export const CHILD_UPCOMING_DAYS = 14;

/** Vinduet til get_upcoming_occurrences: fra i morgen (i dag står allerede i kortet). */
export function upcomingWindow(today: string, days: number): { from: string; to: string } {
  return { from: addDays(today, 1), to: addDays(today, days) };
}

/** En forekomst med dato. key er unik også når samme oppgave kommer flere ganger. */
export type UpcomingItem = { key: string; task: Task; dueOn: string };

/** En hyppig oppgave, vist én gang («Hver dag») med neste dato. */
export type RepeatingItem = { task: Task; nextOn: string };

/** «Denne uken», «Neste uke» eller «Uke 50 · 7.–13. des.». */
export type UpcomingGroup = { key: string; title: string; items: UpcomingItem[] };

export type MemberUpcoming = { repeating: RepeatingItem[]; groups: UpcomingGroup[] };

/**
 * Hyppig = i snitt minst én gang i uken i vinduet, og minst to ganger. I 8 uker betyr det
 * 8 forekomster eller flere. Da blir listen ikke lang av daglige og ukentlige oppgaver.
 */
export function isFrequent(count: number, windowDays: number): boolean {
  return count >= Math.max(2, Math.floor(windowDays / 7));
}

function weekTitle(monday: string, today: string): string {
  const thisWeek = startOfIsoWeek(today);
  if (monday === thisWeek) return 'Denne uken';
  if (monday === addDays(thisWeek, 7)) return 'Neste uke';
  return `Uke ${isoWeekNumber(monday)} · ${formatWeekRange(monday)}`;
}

/**
 * «Kommende» for én person: oppgaver tildelt personen (ikke felles, ikke jobber, som ikke har
 * dato). Hyppige oppgaver (se isFrequent) samles i repeating, én rad hver, med mindre
 * hideFrequent er satt; da vises de ikke i det hele tatt (barnets egen visning). Resten
 * grupperes per ISO-uke, sortert på dato og tittel.
 */
export function upcomingForMember(
  occurrences: Occurrence[],
  tasks: Task[],
  memberId: string,
  today: string,
  { windowDays, hideFrequent = false }: { windowDays: number; hideFrequent?: boolean },
): MemberUpcoming {
  const taskById = new Map(tasks.filter((t) => t.assigned_member_id === memberId).map((t) => [t.id, t]));

  const datesByTask = new Map<string, string[]>();
  for (const o of occurrences) {
    if (!taskById.has(o.task_id)) continue;
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
      if (!hideFrequent) repeating.push({ task, nextOn: sorted[0] });
      continue;
    }
    for (const dueOn of sorted) items.push({ key: `${taskId}:${dueOn}`, task, dueOn });
  }

  repeating.sort((a, b) => a.nextOn.localeCompare(b.nextOn) || a.task.title.localeCompare(b.task.title));
  items.sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.task.title.localeCompare(b.task.title));

  const groups: UpcomingGroup[] = [];
  for (const item of items) {
    const monday = startOfIsoWeek(item.dueOn);
    const last = groups[groups.length - 1];
    if (last?.key === monday) last.items.push(item);
    else groups.push({ key: monday, title: weekTitle(monday, today), items: [item] });
  }

  return { repeating, groups };
}

/** 'Lør. 22. nov.' til datoen på en rad. */
export function formatUpcomingDate(isoDate: string): string {
  const text = formatDate(isoDate);
  return text.charAt(0).toUpperCase() + text.slice(1);
}
