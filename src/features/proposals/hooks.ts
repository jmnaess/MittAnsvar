import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useInvalidateRewards, WAITING_REFRESH_MS } from '../rewards/hooks';
import { useInvalidateTasks } from '../tasks/hooks';
import { addOwnTask, decideProposal, listMyProposals, listPendingProposals, submitProposal } from './api';

export const proposalKeys = {
  all: (householdId: string) => ['proposals', householdId] as const,
  mine: (householdId: string) => ['proposals', householdId, 'mine'] as const,
  pending: (householdId: string) => ['proposals', householdId, 'pending'] as const,
};

/** Henter forslagene på nytt (dra for å oppdatere og fokus i «I dag»). Stabil, så den kan stå i deps. */
export function useInvalidateProposals(householdId: string) {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: proposalKeys.all(householdId) }),
    [queryClient, householdId],
  );
}

/** Barnets egne forslag (barnets enhet). */
export function useMyProposals(householdId: string, enabled = true) {
  return useQuery({
    queryKey: proposalKeys.mine(householdId),
    queryFn: listMyProposals,
    enabled,
  });
}

/** Forslag som venter (voksne). Hentes jevnlig, som godkjenningene. */
export function usePendingProposals(householdId: string) {
  return useQuery({
    queryKey: proposalKeys.pending(householdId),
    queryFn: () => listPendingProposals(householdId),
    refetchInterval: WAITING_REFRESH_MS,
  });
}

export function useSubmitProposal(householdId: string) {
  const onSettled = useInvalidateProposals(householdId);
  return useMutation({ mutationFn: submitProposal, onSettled });
}

/** Barnet legger inn noe uten lønn: en oppgave, og kanskje en avkrysning. Hent oppgavene på nytt. */
export function useAddOwnTask(householdId: string) {
  const invalidateTasks = useInvalidateTasks(householdId);
  return useMutation({ mutationFn: addOwnTask, onSettled: invalidateTasks });
}

/** Godkjenning lager en oppgave og kanskje en avkrysning med lønn: hent alt på nytt. */
export function useDecideProposal(householdId: string) {
  const invalidateProposals = useInvalidateProposals(householdId);
  const invalidateTasks = useInvalidateTasks(householdId);
  const invalidateRewards = useInvalidateRewards(householdId);
  return useMutation({
    mutationFn: ({ id, approve, amountNok }: { id: string; approve: boolean; amountNok?: number | null }) =>
      decideProposal(id, approve, amountNok ?? null),
    onSettled: () => Promise.all([invalidateProposals(), invalidateTasks(), invalidateRewards()]),
  });
}
