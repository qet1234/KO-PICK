import * as Updates from 'expo-updates';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ServiceStatusGate } from '@/components/service-status-gate';
import { SessionProvider } from '@/context/session-context';
import { useSupabaseSessionRefresh } from '@/hooks/use-supabase-session-refresh';

export default function RootLayout() {
  const { isUpdatePending } = Updates.useUpdates();

  useSupabaseSessionRefresh();

  useEffect(() => {
    if (isUpdatePending) {
      void Updates.reloadAsync();
    }
  }, [isUpdatePending]);

  return (
    <SessionProvider>
      <ServiceStatusGate>
        <Stack screenOptions={{ headerShown: false }} />
      </ServiceStatusGate>
      <StatusBar style="dark" />
    </SessionProvider>
  );
}
