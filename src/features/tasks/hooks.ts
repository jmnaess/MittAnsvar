import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  archiveTask,
  createTask,
  createTasks,
  listTasks,
  listTodayTasks,
  listUpcomingOccurrences,
  postponeTask,
  restoreTask,
  undoPostpone,
  updateTask,
} from './api';
import type { TaskInput } from './types';
import { buildUpcoming, EMPTY_UPCOMING, upcomingWindow, type MemberUpcoming } from './upcoming';

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

/**
 * «Kommende»: forekomster fra i morgen og windowDays fram, gruppert med buildUpcoming.
 * memberId: én person (personvisningen, barnets visning), eller null for hele husstanden («Alle»).
 * enabled false = ingenting hentes ennå, og refetch (dra for å oppdatere) gjør ingenting.
 */
export function useMemberUpcoming(
  householdId: string,
  memberId: string | null,
  today: string,
  {
    windowDays,
    hideFrequent = false,
    enabled = true,
  }: { windowDays: number; hideFrequent?: boolean; enabled?: boolean },
): { upcoming: MemberUpcoming; isPending: boolean; refetch: () => Promise<unknown> } {
  const { from, to } = upcomingWindow(today, windowDays);
  const occurrences = useUpcomingOccurrences(householdId, from, to, enabled);
  const tasks = useQuery({
    queryKey: taskKeys.list(householdId),
    queryFn: () => listTasks(householdId),
    enabled,
  });
  const upcoming =
    enabled && occurrences.data && tasks.data
      ? buildUpcoming(occurrences.data, tasks.data, memberId, today, { windowDays, hideFrequent })
      : EMPTY_UPCOMING;
  // refetch fra useQuery hopper over enabled, så vi sjekker selv.
  const refetchOccurrences = occurrences.refetch;
  const refetchTasks = tasks.refetch;
  const refetch = useCallback(
    () => (enabled ? Promise.all([refetchOccurrences(), refetchTasks()]) : Promise.resolve()),
    [enabled, refetchOccurrences, refetchTasks],
  );
  return { upcoming, isPending: occurrences.isPending || tasks.isPending, refetch };
}

export function useInvalidateTasks(householdId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: taskKeys.all(householdId) });
}

export function useCreateTask(householdId: string) {
  const onSuccess = useInvalidateTasks(householdId);
  return useMutation({ mutationFn: (input: TaskInput) => createTask(householdId, input), onSuccess });
}

export function useCreateTasks(householdId: string) {
  const onSuccess = useInvalidateTasks(householdId);
  return useMutation({
    mutationFn: (inputs: TaskInput[]) => createTasks(householdId, inputs),
    onSuccess,
  });
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

export function useRestoreTask(householdId: string) {
  const onSuccess = useInvalidateTasks(householdId);
  return useMutation({ mutationFn: restoreTask, onSuccess });
}

/** «Utsett til». onSettled: også ved feil, i tilfelle en annen voksen har endret oppgaven. */
export function usePostponeTask(householdId: string) {
  const onSettled = useInvalidateTasks(householdId);
  return useMutation({
    mutationFn: ({ taskId, to }: { taskId: string; to: string }) => postponeTask(taskId, to),
    onSettled,
  });
}

export function useUndoPostpone(householdId: string) {
  const onSettled = useInvalidateTasks(householdId);
  return useMutation({ mutationFn: undoPostpone, onSettled });
}
