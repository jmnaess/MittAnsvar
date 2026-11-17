/** «Mine og felles» eller «hele husstanden». */
export type ReminderScope = 'mine' | 'household';

/** Lagres per bruker på enheten (se settings.ts). */
export type ReminderSettings = {
  enabled: boolean;
  hour: number; // 0–23, enhetens lokale tid
  minute: number; // 0–59
  scope: ReminderScope;
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 7,
  minute: 30,
  scope: 'mine',
};

/** Det planleggingen trenger å vite om en oppgave. */
export type ReminderTask = {
  id: string;
  title: string;
  next_due_on: string | null;
  /** null = felles */
  assigned_member_id: string | null;
  is_month_task: boolean;
};

/** Én forekomst fra get_upcoming_occurrences. */
export type Occurrence = { task_id: string; due_on: string };

/** Ett varsel som skal planlegges: dato (YYYY-MM-DD), klokkeslett og tekst. */
export type PlannedReminder = { date: string; hour: number; minute: number; body: string };
