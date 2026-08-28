import * as Updates from 'expo-updates';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { PrivacyConsentGate } from '@/components/privacy-consent-gate';
import { ServiceStatusGate } from '@/components/service-status-gate';
import { SessionProvider } from '@/context/session-context';
import { useSupabaseSessionRefresh } from '@/hooks/use-supabase-session-refresh';
import { trackMobileOperation } from '@/lib/operations';

type NativeErrorUtils = {
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

export default function RootLayout() {
  const { isUpdatePending } = Updates.useUpdates();
  useSupabaseSessionRefresh();

  useEffect(() => {
    if (isUpdatePending) {
      void Updates.reloadAsync();
    }
  }, [isUpdatePending]);

  useEffect(() => {
    const errorUtils = (globalThis as typeof globalThis & { ErrorUtils?: NativeErrorUtils }).ErrorUtils;
    if (!errorUtils) return;
    const previous = errorUtils.getGlobalHandler();
    const handler = (error: Error, isFatal?: boolean) => {
      void trackMobileOperation({
        errorMessage: error.message,
        eventType: isFatal ? 'app_crash' : 'app_error',
        feature: 'mobile_runtime',
        route: 'expo-router',
      });
      previous(error, isFatal);
    };
    errorUtils.setGlobalHandler(handler);
    return () => errorUtils.setGlobalHandler(previous);
  }, []);

  return (
    <SessionProvider>
      <ServiceStatusGate>
        <Stack screenOptions={{ headerShown: false }} />
      </ServiceStatusGate>
      <PrivacyConsentGate />
      <StatusBar style="dark" />
    </SessionProvider>
  );
}
