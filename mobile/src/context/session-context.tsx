import type { Session } from '@supabase/supabase-js';
import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';

import { appConfig } from '@/lib/config';
import { supabase } from '@/lib/supabase';

type SessionContextValue = {
  loading: boolean;
  session: Session | null;
};

const SessionContext = createContext<SessionContextValue>({
  loading: true,
  session: null,
});

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(appConfig.isSupabaseConfigured);

  useEffect(() => {
    if (!appConfig.isSupabaseConfigured) {
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ loading, session }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
