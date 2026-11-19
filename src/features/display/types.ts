import type { TodayCompletion } from '../completions/api';
import type { Member } from '../household/types';
import type { TodayTask } from '../tasks/types';

/** En koblet familieskjerm, slik voksne ser den under «Husstand». */
export type HouseholdDisplay = { id: string; created_at: string };

/** Det familieskjermen får vite om en person. Ikke fødselsår og ikke bruker-id. */
export type BoardMember = Pick<
  Member,
  'id' | 'household_id' | 'role' | 'display_name' | 'avatar' | 'avatar_mode' | 'photo_path'
>;

/** Det familieskjermen får vite om en oppgave i dag. Ikke beskrivelsen. */
export type BoardTask = Pick<
  TodayTask,
  | 'id'
  | 'household_id'
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
  | 'job_member_ids'
  | 'season_start_month'
  | 'season_end_month'
  | 'next_due_on'
  | 'is_overdue'
  | 'is_month_task'
>;

/** Svaret fra get_family_board. Se supabase/migrations/*_family_display.sql. */
export type FamilyBoard = {
  household_id: string;
  household_name: string;
  /** Dagens dato i husstandens tidssone. */
  today: string;
  members: BoardMember[];
  tasks: BoardTask[];
  /** recorded_by er bare satt på det skjermen selv har registrert. */
  completions: TodayCompletion[];
};
