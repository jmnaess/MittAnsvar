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
