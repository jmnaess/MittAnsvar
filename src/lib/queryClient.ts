import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

// TanStack Query holder serverdata (husstand, medlemmer, senere oppgaver) og cacher dem.
// Komponenter bruker hooks i src/features/*/hooks.ts, ikke supabase direkte.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // ett nytt forsøk er nok; flere gjør at feil vises sent
      staleTime: 30_000, // data regnes som ferske i 30 sek, så skjermbytter ikke henter på nytt
    },
  },
});

// I en nettleser henter TanStack Query på nytt når fanen får fokus. I React Native
// finnes ikke det, så vi sier fra når appen kommer i forgrunnen.
AppState.addEventListener('change', (state) => {
  if (Platform.OS !== 'web') focusManager.setFocused(state === 'active');
});
