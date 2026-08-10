import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { appConfig } from '@/lib/config';

export type MobileServiceStatus = {
  affectedFeatures: string[];
  endsAt: string | null;
  message: string;
  mode: 'operational' | 'partial' | 'maintenance';
  startsAt: string | null;
  title: string;
  update: {
    minimumVersion: string;
    required: boolean;
    url: string | null;
  };
  updatedAt: string;
};

function isMobileServiceStatus(value: unknown): value is MobileServiceStatus {
  if (!value || typeof value !== 'object') return false;
  const status = value as Record<string, unknown>;
  const update = status.update;
  return (
    (status.mode === 'operational' || status.mode === 'partial' || status.mode === 'maintenance')
    && typeof status.title === 'string'
    && typeof status.message === 'string'
    && Array.isArray(status.affectedFeatures)
    && typeof status.updatedAt === 'string'
    && Boolean(update)
    && typeof update === 'object'
    && typeof (update as Record<string, unknown>).required === 'boolean'
  );
}

export async function fetchMobileServiceStatus() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const url = new URL('/api/app-status', appConfig.webUrl);
    url.searchParams.set('platform', Platform.OS === 'ios' ? 'ios' : 'android');
    url.searchParams.set('version', Constants.expoConfig?.version ?? '0.0.0');
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('앱 운영 상태를 확인하지 못했습니다.');
    const payload: unknown = await response.json();
    if (!isMobileServiceStatus(payload)) throw new Error('앱 운영 상태 응답이 올바르지 않습니다.');
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}
