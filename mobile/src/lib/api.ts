import { appConfig } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { trackMobileOperation } from '@/lib/operations';

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
  contentTypeId: string;
  openingState: 'open' | 'closed' | 'unknown';
  openingHoursText: string | null;
  restDayText: string | null;
  breakTimeText: string | null;
  source?: 'TOUR_API' | 'NAVER_LOCAL';
};

export type NaverDiningPlace = {
  id: string;
  name: string;
  region: string;
  city: string | null;
  category: string;
  address: string | null;
  latitude: number;
  longitude: number;
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
  district?: string;
  detailType?: string;
  openNow?: boolean;
  query?: string;
  locality?: string;
};

export type TourSubregion = { code: string; name: string };

export type RecommendationQuery = {
  region: string;
  relationship: '개인' | '커플' | '친구' | '가족';
  category: '맛집' | '카페' | '관광지' | '축제';
  budget: string;
  mood?: string;
};

type EngagementScore = {
  place_id: string;
  score: number;
};

async function fetchKoPick<T>(path: string, requestSignal?: AbortSignal) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const abortRequest = () => controller.abort();
  if (requestSignal?.aborted) controller.abort();
  else requestSignal?.addEventListener('abort', abortRequest, { once: true });
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
    void trackMobileOperation({
      durationMs: Date.now() - startedAt,
      eventType: 'api_request',
      feature: path.startsWith('/api/tour') ? 'place_search' : path.startsWith('/api/recommend') ? 'recommendations' : path.startsWith('/api/naver/dining') ? 'office_dining' : 'mobile_api',
      route: path.split('?')[0],
      statusCode: response.status,
      success: response.ok,
    });
    if (!response.ok) {
      throw new Error(payload?.error || `오늘어디 서버 요청에 실패했습니다. (${response.status})`);
    }
    if (!payload) throw new Error('오늘어디 서버 응답을 읽지 못했습니다.');
    return payload;
  } catch (error) {
    void trackMobileOperation({
      durationMs: Date.now() - startedAt,
      errorMessage: error instanceof Error ? error.message : 'Network request failed',
      eventType: 'api_request',
      feature: path.startsWith('/api/tour') ? 'place_search' : path.startsWith('/api/recommend') ? 'recommendations' : path.startsWith('/api/naver/dining') ? 'office_dining' : 'mobile_api',
      route: path.split('?')[0],
      success: false,
    });
    if (error instanceof Error && error.name === 'AbortError') {
      if (requestSignal?.aborted) throw error;
      throw new Error('장소 조회 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    requestSignal?.removeEventListener('abort', abortRequest);
  }
}

async function rankRecommendationsByEngagement(items: Recommendation[]) {
  if (items.length < 2) return items;
  try {
    const params = new URLSearchParams();
    items.slice(0, 50).forEach((item) => params.append('id', item.id));
    const ranking = await fetchKoPick<{ items: EngagementScore[] }>(
      `/api/recommend/engagement?${params.toString()}`,
    );
    if (!Array.isArray(ranking.items) || ranking.items.length === 0) return items;

    const engagement = new Map(
      ranking.items.map((item) => [String(item.place_id), Number(item.score) || 0]),
    );
    return items
      .map((item, index) => ({
        item,
        index,
        combinedScore: item.score + Math.min(8, Math.log1p(engagement.get(item.id) ?? 0) * 2),
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore || a.index - b.index)
      .map(({ item }) => item);
  } catch {
    return items;
  }
}

export type AccountDeletionResult = {
  success: boolean;
  appleRevocation: 'not_applicable' | 'revoked' | 'manual_required';
};

export async function deleteAccount(options?: {
  appleAuthorizationCode?: string;
  visitorId?: string | null;
}) {
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
      body: JSON.stringify({
        appleAuthorizationCode: options?.appleAuthorizationCode,
        visitorId: options?.visitorId,
      }),
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

export async function fetchTourPlaces(query: PlaceQuery, signal?: AbortSignal) {
  const params = new URLSearchParams({
    category: query.category,
    includeImages: 'true',
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 30),
    region: query.region,
  });
  if (query.sigunguCode) params.set('sigunguCode', query.sigunguCode);
  if (query.district && query.district !== '전체') params.set('district', query.district);
  if (query.detailType && query.detailType !== '전체') {
    params.set('detailType', query.detailType);
  }
  if (query.openNow) params.set('openNow', 'true');
  if (query.query?.trim()) params.set('query', query.query.trim());
  if (query.locality?.trim()) params.set('locality', query.locality.trim());

  const result = await fetchKoPick<{
    places: TourPlace[];
    pagination: {
      pageNo: number;
      numOfRows: number;
      totalCount: number;
      totalPages: number;
    };
    sources?: ('TOUR_API' | 'NAVER_LOCAL')[];
  }>(`/api/tour/places-ranked?${params.toString()}`, signal);

  void trackMobileOperation({
    eventType: result.places.length > 0 ? 'search_success' : 'search_no_results',
    feature: 'place_search',
    route: `/api/tour/places-ranked?${params.toString().slice(0, 220)}`,
    metadata: {
      region: query.region,
      category: query.category,
      district: query.district ?? null,
      locality: query.locality?.trim() || null,
      query: query.query?.trim() || null,
      resultCount: result.places.length,
    },
  });
  return result;
}

export async function fetchTourSubregions(region: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ mode: 'subregions', region });
  return fetchKoPick<{ subregions: TourSubregion[] }>(`/api/tour/places-ranked?${params.toString()}`, signal);
}

export async function fetchNaverDiningPlaces(query: {
  mode: '회식' | '점심';
  region: string;
  district: string;
  officeArea: string;
  foodType: string;
  foodDetail: string;
  headcount: string;
  budget: string;
}) {
  const params = new URLSearchParams(query);
  const result = await fetchKoPick<{ places: NaverDiningPlace[]; query: string; budget: string }>(
    `/api/naver/dining-search?${params.toString()}`,
  );
  void trackMobileOperation({
    eventType: result.places.length > 0 ? 'search_success' : 'search_no_results',
    feature: 'office_dining',
    route: `/api/naver/dining-search?${params.toString().slice(0, 220)}`,
    metadata: {
      region: query.region,
      district: query.district,
      foodType: query.foodType,
      foodDetail: query.foodDetail,
      budget: query.budget,
      resultCount: result.places.length,
    },
  });
  return result;
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

  const result = await fetchKoPick<{
    items: Recommendation[];
    source: '한국관광공사 TourAPI';
    attributionUrl: string;
  }>(`/api/recommend?${params.toString()}`);
  const rankedItems = await rankRecommendationsByEngagement(result.items);
  void trackMobileOperation({
    eventType: rankedItems.length > 0 ? 'search_success' : 'search_no_results',
    feature: 'recommendations',
    route: `/api/recommend?${params.toString().slice(0, 220)}`,
    metadata: {
      region: query.region,
      category: query.category,
      relationship: query.relationship,
      budget: query.budget,
      mood: query.mood || '감성적인',
      resultCount: rankedItems.length,
    },
  });
  return { ...result, items: rankedItems };
}
