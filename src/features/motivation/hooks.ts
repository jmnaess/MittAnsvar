import { useQuery } from '@tanstack/react-query';
import { listWeekCompletions } from './api';

/**
 * Barnets avkrysninger og ekstra lønn denne uka. Under ['tasks', householdId], så avkrysning og
 * angring henter dem på nytt (ekstra lønn kommer ved fokus og dra for å oppdatere). monday i
 * nøkkelen gir ny uke ved midnatt søndag.
 */
export function useWeekCompletions(householdId: string, memberId: string | undefined, monday: string, sunday: string) {
  return useQuery({
    queryKey: ['tasks', householdId, 'week-completions', memberId, monday],
    queryFn: () => listWeekCompletions(memberId!, monday, sunday),
    enabled: !!memberId,
  });
}
