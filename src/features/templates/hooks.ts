import { useMutation, useQuery } from '@tanstack/react-query';
import { useInvalidateTasks } from '../tasks/hooks';
import { archiveTask } from '../tasks/api';
import { activateTemplates, listTemplates, setRoutineRecurrence } from './api';
import type { RecurrenceOverride } from './routines';

// Malene er like for alle husstander og endres bare ved en ny app-versjon/migrasjon.
export const templateKeys = { all: ['templates'] as const };

export function useTemplates() {
  return useQuery({ queryKey: templateKeys.all, queryFn: listTemplates, staleTime: Infinity });
}

/** Aktiverte maler blir oppgaver, så oppgavelistene hentes på nytt. */
export function useActivateTemplates(householdId: string) {
  const onSuccess = useInvalidateTasks(householdId);
  return useMutation({
    mutationFn: (templateIds: string[]) => activateTemplates(householdId, templateIds),
    onSuccess,
  });
}

type ActivateRoutinesInput = {
  templateIds: string[];
  memberIds: (string | null)[];
  /** Radene der hyppigheten er endret fra malen. */
  overrides: RecurrenceOverride[];
};

/**
 * «Forslag til hverdagen»: maler med ansvarlig per mal (barnemaler til et barn, ellers felles),
 * deretter ny hyppighet på oppgavene der den er endret. Feiler det siste, kan man trykke
 * «Legg til» igjen: databasen hopper over oppgavene som finnes, og hyppigheten settes på nytt.
 */
export function useActivateRoutines(householdId: string) {
  const invalidate = useInvalidateTasks(householdId);
  return useMutation({
    mutationFn: async ({ templateIds, memberIds, overrides }: ActivateRoutinesInput) => {
      await activateTemplates(householdId, templateIds, memberIds);
      await Promise.all(
        overrides.map((o) => setRoutineRecurrence(householdId, o.templateId, o.memberId, o.recurrence)),
      );
    },
    // Hentes på nytt også ved feil: oppgavene kan være laget selv om hyppigheten feilet.
    onSettled: invalidate,
  });
}

/** «Fjern» på en «Lagt til»-rad: oppgavene arkiveres (historikken blir stående). */
export function useRemoveRoutine(householdId: string) {
  const invalidate = useInvalidateTasks(householdId);
  return useMutation({
    mutationFn: (taskIds: string[]) => Promise.all(taskIds.map(archiveTask)),
    onSettled: invalidate,
  });
}
