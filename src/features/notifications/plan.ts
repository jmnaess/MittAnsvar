// Hvilke dager som får påminnelse, med hvilke oppgaver. Rene funksjoner uten expo-notifications,
// så de kan testes (se __tests__/plan.test.ts). Reglene står i docs/ARCHITECTURE.md §9.
//
// Fremtidige forekomster beregnes av databasen (get_upcoming_occurrences). Her bestemmes bare
// hva som skal stå i varselet hver dag.

import { addDays, firstDayOfMonth, lastDayOfMonth } from '../../lib/dates';
import { formatReminderBody, type MonthLine } from './text';
import type { Occurrence, PlannedReminder, ReminderSettings, ReminderTask } from './types';

/** Så mange dager fram planlegges det. Appen planlegger på nytt hver gang den åpnes. */
export const PLAN_DAYS = 7;

export type PlanInput = {
  /** I dag, enhetens kalenderdato (YYYY-MM-DD). */
  today: string;
  tasks: ReminderTask[];
  occurrences: Occurrence[];
  settings: ReminderSettings;
  /** Mitt medlem i husstanden. null hvis det ikke er kjent (da gjelder bare felles). */
  myMemberId: string | null;
  days?: number;
};

/** «Mine og felles»: oppgaver til meg og oppgaver uten ansvarlig. */
export function inScope(task: ReminderTask, settings: ReminderSettings, myMemberId: string | null) {
  if (settings.scope === 'household') return true;
  return task.assigned_member_id === null || task.assigned_member_id === myMemberId;
}

/**
 * Er oppgaven forfalt på dato, gitt at ingenting blir gjort før det?
 * - Vanlig oppgave: fristen er passert, og det er ikke en ny forekomst den dagen.
 * - Månedsoppgave: først etter siste dag i måneden (som due_by i databasen).
 * - Daglig oppgave: aldri.
 */
export function isOverdueOn(task: ReminderTask, date: string, dueToday: boolean): boolean {
  if (!task.next_due_on || task.is_daily) return false;
  if (task.is_month_task) return date > lastDayOfMonth(task.next_due_on);
  return !dueToday && task.next_due_on < date;
}

/**
 * Månedsoppgaver som ikke er gjort, nevnes to ganger: den 1. og første dag i siste uke
 * (siste dag − 6). En månedsoppgave som er gjort, har fått frist neste år og er ikke med.
 */
export function monthLineFor(date: string, tasks: ReminderTask[]): MonthLine | null {
  const monthStart = firstDayOfMonth(date);
  let kind: MonthLine['kind'];
  if (date === monthStart) kind = 'start';
  else if (date === addDays(lastDayOfMonth(date), -6)) kind = 'last-week';
  else return null;

  const titles = tasks
    .filter((t) => t.is_month_task && t.next_due_on === monthStart)
    .map((t) => t.title);
  return titles.length > 0 ? { kind, titles } : null;
}

/** Teksten for én dag, eller null hvis det ikke er noe å minne om. */
export function bodyForDay(date: string, tasks: ReminderTask[], occurrences: Occurrence[]) {
  const dueIds = new Set(occurrences.filter((o) => o.due_on === date).map((o) => o.task_id));
  const isDue = (t: ReminderTask) => !t.is_month_task && dueIds.has(t.id);

  return formatReminderBody({
    due: tasks.filter(isDue).map((t) => t.title),
    overdueCount: tasks.filter((t) => isOverdueOn(t, date, isDue(t))).length,
    month: monthLineFor(date, tasks),
  });
}

/** Ett varsel per dag de neste dagene, men bare for dager som har noe å si. */
export function planReminders({
  today,
  tasks,
  occurrences,
  settings,
  myMemberId,
  days = PLAN_DAYS,
}: PlanInput): PlannedReminder[] {
  if (!settings.enabled) return [];

  const relevant = tasks.filter((t) => inScope(t, settings, myMemberId));
  const planned: PlannedReminder[] = [];

  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const body = bodyForDay(date, relevant, occurrences);
    if (body) planned.push({ date, hour: settings.hour, minute: settings.minute, body });
  }
  return planned;
}
