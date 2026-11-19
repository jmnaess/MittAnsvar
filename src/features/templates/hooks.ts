import { useMutation, useQuery } from '@tanstack/react-query';
import { useInvalidateTasks } from '../tasks/hooks';
import { activateTemplates, listTemplates } from './api';

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

/** «Forslag til hverdagen»: maler med ansvarlig per mal (barnemaler til et barn, ellers felles). */
export function useActivateRoutines(householdId: string) {
  const onSuccess = useInvalidateTasks(householdId);
  return useMutation({
    mutationFn: ({ templateIds, memberIds }: { templateIds: string[]; memberIds: (string | null)[] }) =>
      activateTemplates(householdId, templateIds, memberIds),
    onSuccess,
  });
}
