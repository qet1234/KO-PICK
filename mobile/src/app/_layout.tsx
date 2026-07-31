import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider } from '@/context/session-context';
import { useSupabaseSessionRefresh } from '@/hooks/use-supabase-session-refresh';

export default function RootLayout() {
  useSupabaseSessionRefresh();

  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="dark" />
    </SessionProvider>
  );
}
