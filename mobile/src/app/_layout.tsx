import * as Updates from 'expo-updates';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

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
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="dark" />
    </SessionProvider>
  );
}
