import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { queryClient } from '../../lib/queryClient';
import { supabase } from '../../lib/supabase';

type SessionState = { session: Session | null; isLoading: boolean };

const SessionContext = createContext<SessionState>({ session: null, isLoading: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ session: null, isLoading: true });

  useEffect(() => {
    // onAuthStateChange sender INITIAL_SESSION med sesjonen fra SecureStore,
    // og deretter en hendelse ved hver innlogging, utlogging og fornying.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Tøm cachen ved utlogging (også etter sletting av konto), så en ny bruker
      // på samme mobil aldri ser forrige brukers husstand.
      if (event === 'SIGNED_OUT') queryClient.clear();
      setState({ session, isLoading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
