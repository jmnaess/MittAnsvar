import { useMutation, useQuery } from '@tanstack/react-query';
import { useInvalidateRewards } from '../rewards/hooks';
import { useInvalidateTasks } from '../tasks/hooks';
import {
  completeTask,
  listRecentCompletions,
  listTodayCompletions,
  reassignCompletion,
  removeCompletion,
  undoCompletion,
} from './api';

// Begge endrer next_due_on (og arkiverer engangsjobber), så både «I dag» og oversikten må hentes
// på nytt. Begge kan også endre saldoen til et barn.
function useInvalidateAfterCompletion(householdId: string) {
  const invalidateTasks = useInvalidateTasks(householdId);
  const invalidateRewards = useInvalidateRewards(householdId);
  return () => Promise.all([invalidateTasks(), invalidateRewards()]);
}

/**
 * Dagens avkrysninger («Gjort i dag» i «I dag»). Ligger under ['tasks', householdId], så
 * avkrysning, angring og godkjenning henter dem på nytt sammen med oppgavene.
 */
export function useTodayCompletions(householdId: string) {
  return useQuery({
    queryKey: ['tasks', householdId, 'today-completions'],
    queryFn: () => listTodayCompletions(householdId),
  });
}

/**
 * Avkrysninger de tre siste dagene («Gjort siste 3 dager»). Under ['tasks', householdId] som
 * dagens, så den hentes på nytt ved endringer. today i nøkkelen gjør at den hentes på nytt ved
 * midnatt. Hentes bare når enabled (en person er valgt).
 */
export function useRecentCompletions(householdId: string, today: string, enabled = true) {
  return useQuery({
    queryKey: ['tasks', householdId, 'recent-completions', today],
    queryFn: () => listRecentCompletions(householdId),
    enabled,
  });
}

export function useCompleteTask(householdId: string) {
  const onSettled = useInvalidateAfterCompletion(householdId);
  return useMutation({
    mutationFn: ({ taskId, memberId }: { taskId: string; memberId: string }) =>
      completeTask(taskId, memberId),
    onSettled,
  });
}

export function useUndoCompletion(householdId: string) {
  const onSettled = useInvalidateAfterCompletion(householdId);
  return useMutation({ mutationFn: undoCompletion, onSettled });
}

/** «Ikke gjort» for voksne, hele dagen. */
export function useRemoveCompletion(householdId: string) {
  const onSettled = useInvalidateAfterCompletion(householdId);
  return useMutation({ mutationFn: removeCompletion, onSettled });
}

/** «Endre hvem som gjorde det» for voksne. Kan flytte lønn mellom barn. */
export function useReassignCompletion(householdId: string) {
  const onSettled = useInvalidateAfterCompletion(householdId);
  return useMutation({
    mutationFn: ({ completionId, memberId }: { completionId: string; memberId: string }) =>
      reassignCompletion(completionId, memberId),
    onSettled,
  });
}
