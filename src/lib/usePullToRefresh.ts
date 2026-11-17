import { useCallback, useState } from 'react';

/**
 * Props til en listes RefreshControl (onRefresh og refreshing).
 *
 * Hjulet vises bare når brukeren selv drar listen ned, ikke når TanStack Query henter i
 * bakgrunnen (når skjermen får fokus, appen kommer i forgrunnen, eller etter en endring).
 * Med refreshing={isRefetching} ble hjulet satt i gang fra koden. Skjer det mens listen
 * vises for første gang, blir hjulet på iOS stående stille og dekker innholdet.
 * Samme løsning som TanStack Query anbefaler for React Native («useRefreshByUser»).
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return { refreshing, onRefresh };
}
