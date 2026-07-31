import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useSupabaseSessionRefresh } from '@/hooks/use-supabase-session-refresh';

export default function RootLayout() {
  useSupabaseSessionRefresh();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="dark" />
    </>
  );
}
