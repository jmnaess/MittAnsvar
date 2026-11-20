import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toIsoDate } from '../../lib/dates';
import { useMembers, useMyHousehold } from '../household/hooks';
import { listPreparedness, setPreparednessItem } from './api';
import { applicableItems, expiringItems, preparednessHousehold, progress } from './items';
import type { PreparednessRow } from './types';

export const preparednessKeys = {
  all: (householdId: string) => ['preparedness', householdId] as const,
};

export function usePreparednessRows(householdId: string) {
  return useQuery({
    queryKey: preparednessKeys.all(householdId),
    queryFn: () => listPreparedness(householdId),
  });
}

/**
 * Henter beredskapslageret på nytt (dra for å oppdatere i Årshjul og «I dag»). Stabil funksjon,
 * så den kan stå i avhengighetene til en useCallback.
 */
export function useInvalidatePreparedness(householdId: string) {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: preparednessKeys.all(householdId) }),
    [queryClient, householdId],
  );
}

/**
 * Varene som gjelder husstanden, med svar, «X av Y» og det som snart går ut.
 * Brukes av skjermen, kortet i Årshjul og kortet i «I dag». Krever husstand (fanene).
 */
export function usePreparedness() {
  const { data: household } = useMyHousehold();
  const householdId = household!.id;
  const { data: members = [] } = useMembers(householdId);
  const rows = usePreparednessRows(householdId);
  const now = new Date();
  const items = applicableItems(
    preparednessHousehold(household!, members, now.getFullYear()),
    rows.data ?? [],
  );
  return {
    householdId,
    items,
    progress: progress(items),
    expiring: expiringItems(items, toIsoDate(now)),
    isPending: rows.isPending,
    error: rows.error,
    refetch: rows.refetch,
  };
}

/**
 * Lagrer ett svar. Listen oppdateres med en gang (optimistisk), så avkrysningen ikke hopper
 * tilbake, og hentes på nytt etterpå.
 */
export function useSetPreparednessItem(householdId: string) {
  const queryClient = useQueryClient();
  const key = preparednessKeys.all(householdId);
  return useMutation({
    mutationFn: setPreparednessItem,
    onMutate: async (row: PreparednessRow) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PreparednessRow[]>(key);
      const saved = { ...row, expires_on: row.status === 'have' ? row.expires_on : null };
      queryClient.setQueryData<PreparednessRow[]>(key, (old = []) => [
        ...old.filter((r) => r.item_key !== row.item_key),
        saved,
      ]);
      return { previous };
    },
    onError: (_e, _row, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
