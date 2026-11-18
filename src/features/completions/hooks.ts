import { useMutation, useQuery } from '@tanstack/react-query';
import { useInvalidateRewards } from '../rewards/hooks';
import { useInvalidateTasks } from '../tasks/hooks';
import { completeTask, listTodayCompletions, undoCompletion } from './api';

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
