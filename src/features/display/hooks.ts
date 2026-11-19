import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { completeTask, undoCompletion } from '../completions/api';
import {
  createDisplayLinkCode,
  getFamilyBoard,
  listDisplays,
  unlinkDisplay,
  unlinkThisDisplay,
} from './api';
import { loadKeepAwake, saveKeepAwake } from './settings';
import type { HouseholdDisplay } from './types';

export const displayKeys = {
  board: ['family-board'] as const,
  list: (householdId: string) => ['displays', householdId] as const,
  keepAwake: ['display-keep-awake'] as const,
};

/** Hvor ofte en koblet skjerm henter nye data. Stopper når appen ikke er i forgrunnen. */
export const BOARD_REFRESH_MS = 60_000;

/**
 * Tavla. Avgjør også om en anonym enhet er en familieskjerm (se app/(app)/_layout.tsx), og
 * hentingen er måten skjermen oppdager at den er koblet fra: da blir svaret null.
 */
export function useFamilyBoard(enabled = true) {
  return useQuery({
    queryKey: displayKeys.board,
    queryFn: getFamilyBoard,
    enabled,
    refetchInterval: (query) => (query.state.data ? BOARD_REFRESH_MS : false),
  });
}

/** pollUntil: hent hvert 3. sekund til funksjonen gir true (mens koden vises). */
export function useDisplays(
  householdId: string,
  { pollUntil }: { pollUntil?: (displays: HouseholdDisplay[]) => boolean } = {},
) {
  return useQuery({
    queryKey: displayKeys.list(householdId),
    queryFn: () => listDisplays(householdId),
    refetchInterval: pollUntil
      ? (query) => (query.state.data && pollUntil(query.state.data) ? false : 3000)
      : undefined,
  });
}

export function useCreateDisplayLinkCode(householdId: string) {
  return useMutation({ mutationFn: () => createDisplayLinkCode(householdId) });
}

export function useUnlinkDisplay(householdId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unlinkDisplay,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: displayKeys.list(householdId) }),
  });
}

/** Skjermen kobler fra seg selv. Utloggingen tømmer cachen (se SessionProvider). */
export function useUnlinkThisDisplay() {
  return useMutation({ mutationFn: unlinkThisDisplay });
}

function useInvalidateBoard() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: displayKeys.board });
}

/** Tavla hentes på nytt før mutasjonen regnes som ferdig, så raden ikke blinker tilbake. */
export function useCompleteOnBoard() {
  const onSettled = useInvalidateBoard();
  return useMutation({
    mutationFn: ({ taskId, memberId }: { taskId: string; memberId: string }) =>
      completeTask(taskId, memberId),
    onSettled,
  });
}

export function useUndoOnBoard() {
  const onSettled = useInvalidateBoard();
  return useMutation({ mutationFn: undoCompletion, onSettled });
}

/** «Hold skjermen våken». Lagres på enheten. */
export function useKeepAwakeSetting() {
  const queryClient = useQueryClient();
  const { data: enabled = true } = useQuery({ queryKey: displayKeys.keepAwake, queryFn: loadKeepAwake });
  const { mutate: setEnabled } = useMutation({
    mutationFn: saveKeepAwake,
    onMutate: (value: boolean) => queryClient.setQueryData(displayKeys.keepAwake, value),
  });
  return { enabled, setEnabled };
}
