import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import { PrivacyConsentGate } from '@/components/privacy-consent-gate';
import { ServiceStatusGate } from '@/components/service-status-gate';
import { SessionProvider } from '@/context/session-context';
import { useSupabaseSessionRefresh } from '@/hooks/use-supabase-session-refresh';
import { appConfig } from '@/lib/config';
import { trackMobileOperation } from '@/lib/operations';

type NativeErrorUtils = {
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

type AndroidDownloadStatus = {
  ready?: boolean;
  versionCode?: number;
};

function getInstalledAndroidVersionCode() {
  const versionCode = Constants.platform?.android?.versionCode;
  return typeof versionCode === 'number' && Number.isFinite(versionCode) ? versionCode : null;
}

export default function RootLayout() {
  const { isUpdatePending } = Updates.useUpdates();
  const nativeUpdatePromptShownRef = useRef(false);

  useSupabaseSessionRefresh();

  useEffect(() => {
    if (isUpdatePending) {
      void Updates.reloadAsync();
    }
  }, [isUpdatePending]);

  useEffect(() => {
    if (Platform.OS !== 'android' || __DEV__) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const installedVersionCode = getInstalledAndroidVersionCode();
          if (installedVersionCode === null) return;

          const response = await fetch(
            `${appConfig.webUrl}/api/app-download?platform=android&status=1&t=${Date.now()}`,
            {
              headers: {
                Accept: 'application/json',
                'Cache-Control': 'no-cache',
              },
            },
          );
          if (!response.ok || cancelled) return;

          const status = (await response.json()) as AndroidDownloadStatus;
          const latestVersionCode = Number(status.versionCode);
          if (
            !status.ready ||
            !Number.isFinite(latestVersionCode) ||
            latestVersionCode <= installedVersionCode ||
            nativeUpdatePromptShownRef.current ||
            cancelled
          ) {
            return;
          }

          nativeUpdatePromptShownRef.current = true;
          Alert.alert(
            '새 Android 버전이 있습니다',
            `현재 빌드 ${installedVersionCode} · 최신 빌드 ${latestVersionCode}\n\n앱을 삭제하지 않고 최신 APK를 덮어쓰기 설치할 수 있습니다.`,
            [
              { text: '나중에', style: 'cancel' },
              {
                text: '업데이트',
                onPress: () => {
                  void Linking.openURL(`${appConfig.webUrl}/download`);
                },
              },
            ],
          );
        } catch {
          // Native update checks must never block app startup.
        }
      })();
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

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
