import { useMutation } from '@tanstack/react-query';
import { useInvalidateRewards } from '../rewards/hooks';
import { useInvalidateTasks } from '../tasks/hooks';
import { completeTask, undoCompletion } from './api';

// Begge endrer next_due_on (og arkiverer engangsjobber), så både «I dag» og oversikten må hentes
// på nytt. Begge kan også endre saldoen til et barn.
function useInvalidateAfterCompletion(householdId: string) {
  const invalidateTasks = useInvalidateTasks(householdId);
  const invalidateRewards = useInvalidateRewards(householdId);
  return () => Promise.all([invalidateTasks(), invalidateRewards()]);
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
