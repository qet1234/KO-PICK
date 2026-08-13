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

function normalizeSession(session: Session | null): Session | null {
  if (!session) return null;

  const metadataProvider = session.user.user_metadata?.provider;
  if (metadataProvider !== 'naver' || session.user.app_metadata.provider === 'naver') {
    return session;
  }

  return {
    ...session,
    user: {
      ...session.user,
      app_metadata: {
        ...session.user.app_metadata,
        provider: 'naver',
      },
    },
  };
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(appConfig.isSupabaseConfigured);

  useEffect(() => {
    if (!appConfig.isSupabaseConfigured) {
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(normalizeSession(data.session));
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(normalizeSession(nextSession));
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
