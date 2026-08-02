import { appConfig } from '@/lib/config';
import { supabase } from '@/lib/supabase';

export type TourPlace = {
  id: string;
  name: string;
  region: string;
  city: string | null;
  category: string;
  address: string | null;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  imageThumbnailUrl: string | null;
  imageCopyrightCode: 'Type1' | 'Type3' | null;
  imageLicenseLabel: string | null;
  imageAttribution: string | null;
  imageModificationAllowed: boolean;
  imageLicenseUrl: string | null;
  imageSourceUrl: string | null;
};

export type Recommendation = {
  id: string;
  name: string;
  category: string;
  address: string;
  description: string;
  mapUrl: string;
  reservationUrl: string;
  score: number;
  reason: string;
  source: '한국관광공사 TourAPI';
  imageUrl: string | null;
  imageCopyrightCode: 'Type1' | 'Type3' | null;
  imageLicenseLabel: string | null;
  imageAttribution: string | null;
  imageModificationAllowed: boolean;
  imageLicenseUrl: string | null;
  imageSourceUrl: string | null;
};

export type PlaceQuery = {
  region: string;
  category: '전체' | '맛집' | '카페' | '관광지' | '축제';
  page?: number;
  pageSize?: number;
  sigunguCode?: string;
  detailType?: string;
};

export type RecommendationQuery = {
  region: string;
  relationship: '개인' | '커플' | '친구' | '가족';
  category: '맛집' | '카페' | '관광지' | '축제';
  budget: string;
  mood?: string;
};

async function fetchKoPick<T>(path: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const { data } = await supabase.auth.getSession();
  const headers = new Headers({ Accept: 'application/json' });
  if (data.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }

  try {
    const response = await fetch(`${appConfig.webUrl.replace(/\/$/, '')}${path}`, {
      headers,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
    if (!response.ok) {
      throw new Error(payload?.error || `KO-PICK 서버 요청에 실패했습니다. (${response.status})`);
    }
    if (!payload) throw new Error('KO-PICK 서버 응답을 읽지 못했습니다.');
    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('장소 조회 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export type AccountDeletionResult = {
  success: boolean;
  appleRevocation: 'not_applicable' | 'revoked' | 'manual_required';
};

export async function deleteAccount(appleAuthorizationCode?: string) {
  if (!appConfig.isSupabaseConfigured) {
    throw new Error('Supabase 앱 환경변수가 설정되지 않았습니다.');
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('로그인 정보가 없거나 만료되었습니다.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const endpoint = `${appConfig.supabaseUrl.replace(/\/$/, '')}/functions/v1/kopick-api/api/web/account`;
  try {
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        apikey: appConfig.supabasePublishableKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ appleAuthorizationCode }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as (AccountDeletionResult & { error?: string }) | null;
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || `회원탈퇴에 실패했습니다. (${response.status})`);
    }
    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('회원탈퇴 요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchTourPlaces(query: PlaceQuery) {
  const params = new URLSearchParams({
    category: query.category,
    includeImages: 'true',
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 30),
    region: query.region,
  });
  if (query.sigunguCode) params.set('sigunguCode', query.sigunguCode);
  if (query.detailType && query.detailType !== '전체') {
    params.set('detailType', query.detailType);
  }

  return fetchKoPick<{
    places: TourPlace[];
    pagination: {
      pageNo: number;
      numOfRows: number;
      totalCount: number;
      totalPages: number;
    };
  }>(`/api/tour/places?${params.toString()}`);
}

export async function fetchRecommendations(query: RecommendationQuery) {
  const params = new URLSearchParams({
    budget: query.budget,
    category: query.category,
    mode: 'single',
    mood: query.mood || '감성적인',
    region: query.region,
    relationship: query.relationship,
    resultCount: '6',
    scope: query.region === '전국' ? '전국' : '내 지역',
  });

  return fetchKoPick<{
    items: Recommendation[];
    source: '한국관광공사 TourAPI';
    attributionUrl: string;
  }>(`/api/recommend?${params.toString()}`);
}
