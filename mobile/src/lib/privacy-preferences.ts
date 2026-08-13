import AsyncStorage from '@react-native-async-storage/async-storage';

import { appConfig } from '@/lib/config';

export type AnalyticsConsent = 'granted' | 'denied' | null;

const ANALYTICS_CONSENT_KEY = 'todaywhere:analytics-consent:v1';
const ANALYTICS_PROMPTED_PREFIX = 'todaywhere:analytics-consent-prompted:v1:';
const OPERATIONS_VISITOR_KEY = 'kopick:operations-visitor:v1';
const SAVED_PLACES_KEY = 'todaywhere:saved-places:v1';
const RECENT_PLACES_KEY = 'todaywhere:recent-places:v1';
const MAP_PREFERENCE_KEY = 'kopick-preferred-route-map';

export async function getAnalyticsConsent(): Promise<AnalyticsConsent> {
  const value = await AsyncStorage.getItem(ANALYTICS_CONSENT_KEY);
  return value === 'granted' || value === 'denied' ? value : null;
}

export async function hasAnalyticsConsentPrompted(userId: string) {
  return AsyncStorage.getItem(`${ANALYTICS_PROMPTED_PREFIX}${userId}`).then((value) => value === '1');
}

export async function setAnalyticsConsent(
  value: Exclude<AnalyticsConsent, null>,
  userId?: string,
) {
  const previousVisitorId = await AsyncStorage.getItem(OPERATIONS_VISITOR_KEY);
  await AsyncStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  if (userId) await AsyncStorage.setItem(`${ANALYTICS_PROMPTED_PREFIX}${userId}`, '1');

  if (value === 'denied' && previousVisitorId) {
    try {
      await fetch(new URL('/api/operations/consent-withdrawal', appConfig.webUrl).toString(), {
        body: JSON.stringify({ visitorId: previousVisitorId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
    } catch {
      // 동의 철회는 즉시 적용하며, 서버 기록은 최대 90일 보유기간이 지나면 자동 삭제됩니다.
    }
    await AsyncStorage.removeItem(OPERATIONS_VISITOR_KEY);
  }
}

export async function clearMobileLocalData() {
  const allKeys = await AsyncStorage.getAllKeys();
  const promptedKeys = allKeys.filter((key) => key.startsWith(ANALYTICS_PROMPTED_PREFIX));
  await AsyncStorage.multiRemove([
    ANALYTICS_CONSENT_KEY,
    OPERATIONS_VISITOR_KEY,
    SAVED_PLACES_KEY,
    RECENT_PLACES_KEY,
    MAP_PREFERENCE_KEY,
    ...promptedKeys,
  ]);
}
