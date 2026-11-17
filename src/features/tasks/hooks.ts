import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveTask,
  createTask,
  listTasks,
  listTodayTasks,
  listUpcomingOccurrences,
  updateTask,
} from './api';
import type { TaskInput } from './types';

// Begge listene ligger under ['tasks', householdId]. Da holder det å invalidere den
// nøkkelen for å hente både oversikten og «I dag» på nytt.
export const taskKeys = {
  all: (householdId: string) => ['tasks', householdId] as const,
  list: (householdId: string) => ['tasks', householdId, 'list'] as const,
  today: (householdId: string) => ['tasks', householdId, 'today'] as const,
  upcoming: (householdId: string, from: string, to: string) =>
    ['tasks', householdId, 'upcoming', from, to] as const,
};

export function useTasks(householdId: string) {
  return useQuery({ queryKey: taskKeys.list(householdId), queryFn: () => listTasks(householdId) });
}

export function useTodayTasks(householdId: string) {
  return useQuery({
    queryKey: taskKeys.today(householdId),
    queryFn: () => listTodayTasks(householdId),
  });
}

/** Forekomster i et vindu. Ligger under ['tasks', householdId], så endringer henter dem på nytt. */
export function useUpcomingOccurrences(householdId: string, from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: taskKeys.upcoming(householdId, from, to),
    queryFn: () => listUpcomingOccurrences(householdId, from, to),
    enabled,
  });
}

export function useInvalidateTasks(householdId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: taskKeys.all(householdId) });
}

export function useCreateTask(householdId: string) {
  const onSuccess = useInvalidateTasks(householdId);
  return useMutation({ mutationFn: (input: TaskInput) => createTask(householdId, input), onSuccess });
}

export function useUpdateTask(householdId: string) {
  const onSuccess = useInvalidateTasks(householdId);
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: TaskInput }) => updateTask(taskId, input),
    onSuccess,
  });
}

export function useArchiveTask(householdId: string) {
  const onSuccess = useInvalidateTasks(householdId);
  return useMutation({ mutationFn: archiveTask, onSuccess });
}
