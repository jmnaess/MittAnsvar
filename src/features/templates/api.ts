import { unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
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
