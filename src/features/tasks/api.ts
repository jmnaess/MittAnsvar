import { unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';
import type { Occurrence, Task, TaskInput, TodayTask } from './types';

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

/**
 * Forekomster i [from, to], som om hver oppgave blir utført på fristen. Beregnes i databasen
 * (samme regel som neste frist). Maks ett år.
 */
export async function listUpcomingOccurrences(
  householdId: string,
  from: string,
  to: string,
): Promise<Occurrence[]> {
  return unwrap(
    await supabase.rpc('get_upcoming_occurrences', {
      p_household_id: householdId,
      p_from: from,
      p_to: to,
    }),
  );
}

export async function createTask(householdId: string, input: TaskInput): Promise<void> {
  // anchor_on, next_due_on og created_by settes av en trigger i databasen, og klienten har
  // ikke lov til å sende dem. Den genererte typen vet ikke om triggeren og krever anchor_on.
  const row = { household_id: householdId, ...input } as TaskInsert;
  unwrap(await supabase.from('tasks').insert(row));
}

/**
 * Flere oppgaver i ett kall («Ny årlig oppgave» med flere måneder). Én insert-spørring er én
 * transaksjon: enten lagres alle, eller ingen.
 */
export async function createTasks(householdId: string, inputs: TaskInput[]): Promise<void> {
  const rows = inputs.map((input) => ({ household_id: householdId, ...input }) as TaskInsert);
  unwrap(await supabase.from('tasks').insert(rows));
}

/** Endres gjentakelsen, beregner databasen en ny frist fra i dag. */
export async function updateTask(taskId: string, input: TaskInput): Promise<void> {
  unwrap(await supabase.from('tasks').update(input).eq('id', taskId));
}

/** «Angre» etter sletting: oppgaven blir aktiv igjen, med samme frist som før. */
export async function restoreTask(taskId: string): Promise<void> {
  unwrap(await supabase.from('tasks').update({ archived_at: null }).eq('id', taskId));
}

/** «Slett» arkiverer, slik at historikken beholdes. */
export async function archiveTask(taskId: string): Promise<void> {
  unwrap(
    await supabase.from('tasks').update({ archived_at: new Date().toISOString() }).eq('id', taskId),
  );
}
