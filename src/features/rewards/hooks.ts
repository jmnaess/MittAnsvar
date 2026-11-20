import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useInvalidateTasks } from '../tasks/hooks';
import {
  approveCompletions,
  listBalances,
  listPendingCompletions,
  listRewardHistory,
  recordPayout,
  rejectCompletion,
  setCompletionStatus,
  type MemberBalance,
} from './api';

/**
 * Hvor ofte det som venter på en voksen (godkjenninger og forslag) hentes mens appen er åpen.
 * Samme takt som familieskjermen. TanStack henter ikke når appen ligger i bakgrunnen.
 */
export const WAITING_REFRESH_MS = 60_000;

// Saldo og historikk ligger under ['rewards', householdId]. Avkrysning, angring og utbetaling
// invaliderer den nøkkelen.
export const rewardKeys = {
  all: (householdId: string) => ['rewards', householdId] as const,
  balances: (householdId: string) => ['rewards', householdId, 'balances'] as const,
  history: (householdId: string, memberId: string) =>
    ['rewards', householdId, 'history', memberId] as const,
  // Under ['rewards', householdId], så avkrysning og angring også henter denne på nytt.
  pending: (householdId: string) => ['rewards', householdId, 'pending'] as const,
};

export function useBalances(householdId: string) {
  return useQuery({
    queryKey: rewardKeys.balances(householdId),
    queryFn: () => listBalances(householdId),
  });
}

/** Saldoraden til ett barn (undefined til den er hentet). Vis den med formatBalance. */
export function useBalance(householdId: string, memberId: string): MemberBalance | undefined {
  const { data } = useBalances(householdId);
  return data?.find((b) => b.member_id === memberId);
}

export function useRewardHistory(householdId: string, memberId: string) {
  return useQuery({
    queryKey: rewardKeys.history(householdId, memberId),
    queryFn: () => listRewardHistory(memberId),
  });
}

/** Stabil, så den kan stå i deps (refetch i «I dag»). */
export function useInvalidateRewards(householdId: string) {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: rewardKeys.all(householdId) }),
    [queryClient, householdId],
  );
}

export function useRecordPayout(householdId: string) {
  const onSettled = useInvalidateRewards(householdId);
  return useMutation({
    mutationFn: ({ memberId, amountNok }: { memberId: string; amountNok: number }) =>
      recordPayout(memberId, amountNok),
    onSettled,
  });
}

// ---------------------------------------------------------------------------
// Godkjenning (steg 10b)
// ---------------------------------------------------------------------------

export function usePendingCompletions(householdId: string) {
  return useQuery({
    queryKey: rewardKeys.pending(householdId),
    queryFn: () => listPendingCompletions(householdId),
    refetchInterval: WAITING_REFRESH_MS,
  });
}

/** Avvisning kan sette fristen tilbake og legge en jobb tilbake på tavla, så også oppgavene hentes. */
function useInvalidateAfterReview(householdId: string) {
  const invalidateRewards = useInvalidateRewards(householdId);
  const invalidateTasks = useInvalidateTasks(householdId);
  return () => Promise.all([invalidateRewards(), invalidateTasks()]);
}

export function useApproveCompletions(householdId: string) {
  const onSettled = useInvalidateAfterReview(householdId);
  return useMutation({ mutationFn: approveCompletions, onSettled });
}

export function useRejectCompletion(householdId: string) {
  const onSettled = useInvalidateAfterReview(householdId);
  return useMutation({ mutationFn: rejectCompletion, onSettled });
}

/** Endre godkjenning i ettertid. Kan flytte fristen og en jobb, så også oppgavene hentes. */
export function useSetCompletionStatus(householdId: string) {
  const onSettled = useInvalidateAfterReview(householdId);
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      setCompletionStatus(id, status),
    onSettled,
  });
}
