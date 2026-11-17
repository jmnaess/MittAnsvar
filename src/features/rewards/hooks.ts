import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listBalances, listRewardHistory, recordPayout } from './api';

// Saldo og historikk ligger under ['rewards', householdId]. Avkrysning, angring og utbetaling
// invaliderer den nøkkelen.
export const rewardKeys = {
  all: (householdId: string) => ['rewards', householdId] as const,
  balances: (householdId: string) => ['rewards', householdId, 'balances'] as const,
  history: (householdId: string, memberId: string) =>
    ['rewards', householdId, 'history', memberId] as const,
};

export function useBalances(householdId: string) {
  return useQuery({
    queryKey: rewardKeys.balances(householdId),
    queryFn: () => listBalances(householdId),
  });
}

/** Saldoen til ett barn i hele kroner (0 til den er hentet). */
export function useBalance(householdId: string, memberId: string): number {
  const { data } = useBalances(householdId);
  return data?.find((b) => b.member_id === memberId)?.balance_nok ?? 0;
}

export function useRewardHistory(householdId: string, memberId: string) {
  return useQuery({
    queryKey: rewardKeys.history(householdId, memberId),
    queryFn: () => listRewardHistory(memberId),
  });
}

export function useInvalidateRewards(householdId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: rewardKeys.all(householdId) });
}

export function useRecordPayout(householdId: string) {
  const onSettled = useInvalidateRewards(householdId);
  return useMutation({
    mutationFn: ({ memberId, amountNok }: { memberId: string; amountNok: number }) =>
      recordPayout(memberId, amountNok),
    onSettled,
  });
}
