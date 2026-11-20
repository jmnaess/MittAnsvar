import { unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import type { RoutineRecurrence } from './routines';
import type { TaskTemplate } from './types';

/** Alle aktive maler (RLS gir bare aktive). Filtreres på husstanden i suggest.ts. */
export async function listTemplates(): Promise<TaskTemplate[]> {
  return unwrap(
    await supabase.from('task_templates').select('*').order('month').order('sort_order'),
  );
}

/**
 * Lager vanlige oppgaver av malene. Maler som allerede er aktive, hoppes over i databasen.
 * memberIds (samme lengde som templateIds): hvem hver oppgave tildeles. null = felles.
 * Barnemaler må ha et barn, andre maler må være felles. Uten memberIds blir alle felles.
 * Returnerer antall nye oppgaver. Deaktivering = archiveTask på oppgaven.
 */
export async function activateTemplates(
  householdId: string,
  templateIds: string[],
  memberIds?: (string | null)[],
): Promise<number> {
  return unwrap(
    await supabase.rpc('activate_templates', {
      p_household_id: householdId,
      p_template_ids: templateIds,
      // De genererte typene kjenner ikke null i en uuid[]. Postgres tar imot dem.
      ...(memberIds ? { p_member_ids: memberIds as string[] } : {}),
    }),
  );
}

/**
 * Ny hyppighet på oppgaven som nettopp ble laget fra en rutinemal («Forslag til hverdagen»):
 * fast kalender eller intervall fra «Annet …». Aldri årlig eller med periode. Treffer den aktive oppgaven med malen og den ansvarlige. Felles = assigned_member_id is null
 * (i SQL er «= null» aldri sant). Triggeren tasks_set_defaults regner ut ny frist.
 * Trygg å kjøre på nytt: samme verdier gir samme resultat.
 */
export async function setRoutineRecurrence(
  householdId: string,
  templateId: string,
  memberId: string | null,
  recurrence: RoutineRecurrence,
): Promise<void> {
  const query = supabase
    .from('tasks')
    .update({ month: null, season_start_month: null, season_end_month: null, ...recurrence })
    .eq('household_id', householdId)
    .eq('template_id', templateId)
    .is('archived_at', null);
  unwrap(
    await (memberId === null
      ? query.is('assigned_member_id', null)
      : query.eq('assigned_member_id', memberId)),
  );
}
