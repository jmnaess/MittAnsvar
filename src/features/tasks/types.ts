import type { Database } from '../../types/database';

type Tables = Database['public']['Tables'];
type Views = Database['public']['Views'];
type Enums = Database['public']['Enums'];

export type Task = Tables['tasks']['Row'];
export type TodayTask = Views['today_tasks']['Row'];

/** En fremtidig forekomst fra get_upcoming_occurrences. */
export type Occurrence = Database['public']['Functions']['get_upcoming_occurrences']['Returns'][number];

export type RecurrenceType = Enums['recurrence_type'];
export type RecurrenceUnit = Enums['recurrence_unit'];

/** Gjentakelseskolonnene på tasks. Se docs/DATABASE.md §2. */
export type Recurrence = Pick<
  Task,
  | 'recurrence_type'
  | 'recurrence_unit'
  | 'recurrence_every'
  | 'weekdays'
  | 'month_day'
  | 'month'
  | 'job_repeats'
>;

/**
 * Det brukeren fyller ut i skjemaet. null som ansvarlig = felles (for jobber: alle barna).
 * reward_nok: lønn i hele kroner, null = ingen lønn.
 * job_member_ids: bare for jobber, barna som kan ta den. Tom = alle barna. Jobber har aldri
 * assigned_member_id.
 * once_on: datoen for en engangsoppgave. null = i dag (og alltid null for andre typer).
 */
export type TaskInput = Recurrence & {
  once_on: string | null;
  title: string;
  assigned_member_id: string | null;
  job_member_ids: string[];
  reward_nok: number | null;
};
