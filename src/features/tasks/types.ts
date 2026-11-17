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
  'recurrence_type' | 'recurrence_unit' | 'recurrence_every' | 'weekdays' | 'month_day' | 'month'
>;

/** Det brukeren fyller ut i skjemaet. null som ansvarlig = felles. */
export type TaskInput = Recurrence & {
  title: string;
  assigned_member_id: string | null;
};
