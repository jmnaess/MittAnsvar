import { useMutation } from '@tanstack/react-query';
import { useInvalidateTasks } from '../tasks/hooks';
import { completeTask, undoCompletion } from './api';

// Begge endrer next_due_on, så både «I dag» og oversikten må hentes på nytt.

export function useCompleteTask(householdId: string) {
  const onSettled = useInvalidateTasks(householdId);
  return useMutation({
    mutationFn: ({ taskId, memberId }: { taskId: string; memberId: string }) =>
      completeTask(taskId, memberId),
    onSettled,
  });
}

export function useUndoCompletion(householdId: string) {
  const onSettled = useInvalidateTasks(householdId);
  return useMutation({ mutationFn: undoCompletion, onSettled });
}
