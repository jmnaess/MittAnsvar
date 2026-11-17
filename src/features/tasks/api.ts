import { unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';
import type { Task, TaskInput, TodayTask } from './types';

type TaskInsert = Database['public']['Tables']['tasks']['Insert'];

/** Alle aktive oppgaver. Nærmeste frist først. Utførte engangsoppgaver (uten frist) sist. */
export async function listTasks(householdId: string): Promise<Task[]> {
  return unwrap(
    await supabase
      .from('tasks')
      .select('*')
      .eq('household_id', householdId)
      .is('archived_at', null)
      .order('next_due_on', { ascending: true, nullsFirst: false })
      .order('title'),
  );
}

/** Forfalte oppgaver og oppgaver som forfaller i dag. «I dag» regnes ut i databasen. */
export async function listTodayTasks(householdId: string): Promise<TodayTask[]> {
  return unwrap(
    await supabase
      .from('today_tasks')
      .select('*')
      .eq('household_id', householdId)
      .order('next_due_on')
      .order('title'),
  );
}

export async function createTask(householdId: string, input: TaskInput): Promise<void> {
  // anchor_on, next_due_on og created_by settes av en trigger i databasen, og klienten har
  // ikke lov til å sende dem. Den genererte typen vet ikke om triggeren og krever anchor_on.
  const row = { household_id: householdId, ...input } as TaskInsert;
  unwrap(await supabase.from('tasks').insert(row));
}

/** Endres gjentakelsen, beregner databasen en ny frist fra i dag. */
export async function updateTask(taskId: string, input: TaskInput): Promise<void> {
  unwrap(await supabase.from('tasks').update(input).eq('id', taskId));
}

/** «Slett» arkiverer, slik at historikken beholdes. */
export async function archiveTask(taskId: string): Promise<void> {
  unwrap(
    await supabase.from('tasks').update({ archived_at: new Date().toISOString() }).eq('id', taskId),
  );
}
