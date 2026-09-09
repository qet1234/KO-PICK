import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { appConfig } from '@/lib/config';
import { getAnalyticsConsent } from '@/lib/privacy-preferences';
import { supabase } from '@/lib/supabase';

const VISITOR_KEY = 'kopick:operations-visitor:v1';

type MobileOperationEvent = {
  eventType: 'search_success' | 'search_no_results' | 'place_card_click' | 'map_open' | 'directions_open' | 'booking_open' | 'app_error' | 'app_crash' | 'api_request';
  feature: string;
  route?: string;
  placeId?: string;
  placeName?: string;
  category?: string;
  durationMs?: number;
  statusCode?: number;
  success?: boolean;
  errorMessage?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

async function visitorId() {
  const current = await AsyncStorage.getItem(VISITOR_KEY);
  if (current) return current;
  const created = Crypto.randomUUID();
  await AsyncStorage.setItem(VISITOR_KEY, created);
  return created;
}

export async function getMobileOperationVisitorId() {
  return AsyncStorage.getItem(VISITOR_KEY);
}

export async function trackMobileOperation(event: MobileOperationEvent) {
  try {
    if (await getAnalyticsConsent() !== 'granted') return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(new URL('/api/operations/events', appConfig.webUrl).toString(), {
      body: JSON.stringify({
        ...event,
        platform: 'android',
        visitorId: await visitorId(),
      }),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      method: 'POST',
    });
  } catch {
    // 운영 기록 장애가 앱 사용을 방해하지 않도록 무시합니다.
  }
}

export async function reportMobilePlace(place: {
  id: string;
  name: string;
  category?: string | null;
  address?: string | null;
}, reason: 'incorrect_info' | 'closed' | 'wrong_location') {
  const response = await fetch(new URL('/api/operations/place-reports', appConfig.webUrl).toString(), {
    body: JSON.stringify({
      address: place.address,
      category: place.category,
      placeId: place.id,
      placeName: place.name,
      platform: 'android',
      reason,
      visitorId: await visitorId(),
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error || '신고를 접수하지 못했습니다.');
}
