import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const regionCodes: Record<string, string> = {
  서울: "1", 인천: "2", 대전: "3", 대구: "4", 광주: "5", 부산: "6",
  울산: "7", 세종: "8", 경기: "31", 강원: "32", 충북: "33", 충남: "34",
  경북: "35", 경남: "36", 전북: "37", 전남: "38", 제주: "39",
};

const categoryTypes: Record<string, string> = {
  음식: "39", 맛집: "39", 카페: "39", 축제: "15", 관광지: "12", 문화: "14",
};

const detailKeywords: Record<string, string[]> = {
  한식: ["한식", "한정식", "국밥", "국수", "갈비", "백반"],
  일식: ["일식", "초밥", "스시", "라멘", "우동", "돈카츠"],
  중식: ["중식", "중국", "짜장", "짬뽕", "마라"],
  양식: ["양식", "파스타", "피자", "스테이크", "브런치"],
  세계음식: ["베트남", "태국", "인도", "멕시코", "터키", "세계"],
  해산물: ["해산물", "회", "횟집", "조개", "게", "수산"],
  간편식: ["분식", "김밥", "떡볶이", "샌드위치", "버거"],
  건강식: ["건강", "비건", "채식", "샐러드", "사찰"],
  주점: ["주점", "술집", "포차", "펍", "와인"],
  프랜차이즈: ["스타벅스", "투썸", "이디야", "컴포즈", "메가", "빽다방", "더벤티", "할리스", "커피빈", "폴바셋", "파스쿠찌", "엔제리너스"],
  감성카페: ["감성", "카페", "커피"],
  뷰카페: ["전망", "오션뷰", "바다", "강변", "루프탑"],
  대형카페: ["대형", "베이커리", "복합문화"],
  "조용한카페": ["조용", "북카페", "한옥"],
  "작업하기 좋은 카페": ["스터디", "작업", "북카페"],
  이색카페: ["이색", "테마", "동물", "한옥"],
  지역축제: ["축제"], 계절축제: ["봄", "여름", "가을", "겨울", "꽃"],
  먹거리축제: ["음식", "먹거리", "푸드"], 전통축제: ["전통", "문화제", "민속"],
  문화예술축제: ["문화", "예술", "공연"], "음악 페스티벌": ["음악", "뮤직", "콘서트", "페스티벌"],
  불꽃축제: ["불꽃"], 체험행사: ["체험", "행사"],
  박물관: ["박물관"], "미술관·전시관": ["미술관", "전시관", "갤러리"],
  전시회: ["전시"], 공원: ["공원", "수목원", "정원"],
  자연명소: ["산", "바다", "폭포", "계곡", "숲", "해변"],
  "역사·유적": ["궁", "성", "유적", "사찰", "고택", "역사"],
  테마파크: ["테마파크", "놀이공원", "아쿠아리움", "동물원"],
};

const categoryIcons: Record<string, string> = {
  음식: "🍽", 맛집: "🍽", 카페: "☕", 축제: "✦", 관광지: "⌖", 문화: "▣",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function cleanServiceKey(value: string) {
  try { return decodeURIComponent(value.trim()); } catch { return value.trim(); }
}

function routePath(url: URL) {
  const marker = "/kopick-api";
  const index = url.pathname.indexOf(marker);
  return index >= 0 ? url.pathname.slice(index + marker.length) || "/" : url.pathname;
}

function supabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase 서버 환경변수가 설정되지 않았습니다.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function callerClient(req: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) throw new Error("Supabase 인증 환경변수가 설정되지 않았습니다.");
  return createClient(url, key, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function tourRequest(endpoint: string, params: Record<string, string>) {
  const serviceKey = Deno.env.get("TOUR_API_SERVICE_KEY");
  if (!serviceKey) throw new Error("TOUR_API_SERVICE_KEY가 설정되지 않았습니다.");
  const query = new URLSearchParams({
    serviceKey: cleanServiceKey(serviceKey),
    MobileOS: "ETC",
    MobileApp: Deno.env.get("TOUR_API_MOBILE_APP") || "KoreaPick",
    _type: "json",
    ...params,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`https://apis.data.go.kr/B551011/KorService2/${endpoint}?${query}`, {
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`TourAPI 응답 오류 (${response.status})`);
    let payload: any;
    try { payload = JSON.parse(text); } catch { throw new Error("TourAPI가 JSON이 아닌 응답을 반환했습니다."); }
    const header = payload?.response?.header;
    if (header?.resultCode && header.resultCode !== "0000") {
      throw new Error(header.resultMsg || `TourAPI 오류 ${header.resultCode}`);
    }
    return payload?.response?.body ?? {};
  } finally {
    clearTimeout(timeout);
  }
}

function itemsFrom(body: any): any[] {
  const item = body?.items?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function textOf(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function transformPlace(item: any, fallbackCategory: string) {
  const address = textOf(item.addr1) || null;
  const addressParts = address?.split(/\s+/) ?? [];
  const category = fallbackCategory === "전체" ? (textOf(item.contenttypeid) === "39" ? "음식" : textOf(item.contenttypeid) === "15" ? "축제" : "관광지") : fallbackCategory;
  return {
    id: textOf(item.contentid),
    contentTypeId: textOf(item.contenttypeid),
    name: textOf(item.title),
    title: textOf(item.title),
    region: addressParts[0] || "전국",
    city: addressParts[1] || null,
    location: addressParts.slice(0, 2).join(" ") || "전국",
    category,
    address,
    latitude: Number(item.mapy || 0),
    longitude: Number(item.mapx || 0),
    imageUrl: textOf(item.firstimage) || textOf(item.firstimage2) || null,
    tel: textOf(item.tel) || null,
    kakaoPlaceUrl: null,
    bookingAvailable: false,
    bookingGuide: null,
    bookingUrl: null,
  };
}

function matchesDetail(place: any, detailType: string) {
  if (!detailType || detailType === "전체") return true;
  const words = detailKeywords[detailType] ?? [detailType];
  const haystack = `${place.name} ${place.address ?? ""} ${place.category}`.toLowerCase();
  return words.some((word) => haystack.includes(word.toLowerCase()));
}

async function kakaoFranchisePlaces(region: string, city: string, limit: number) {
  const key = Deno.env.get("KAKAO_REST_API_KEY");
  if (!key || limit <= 0) return [];
  const brands = detailKeywords.프랜차이즈;
  const results: any[] = [];
  for (const brand of brands) {
    if (results.length >= limit) break;
    const query = [region === "전국" ? "" : region, city, brand].filter(Boolean).join(" ");
    const params = new URLSearchParams({ query, category_group_code: "CE7", size: "15", page: "1" });
    try {
      const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, {
        headers: { Authorization: `KakaoAK ${key}` },
      });
      if (!response.ok) continue;
      const payload = await response.json();
      for (const doc of payload.documents ?? []) {
        results.push({
          id: `kakao-${doc.id}`,
          contentTypeId: "kakao",
          name: doc.place_name,
          title: doc.place_name,
          region: (doc.road_address_name || doc.address_name || region).split(/\s+/)[0] || region,
          city: (doc.road_address_name || doc.address_name || "").split(/\s+/)[1] || null,
          location: (doc.road_address_name || doc.address_name || region).split(/\s+/).slice(0, 2).join(" "),
          category: "카페",
          address: doc.road_address_name || doc.address_name || null,
          latitude: Number(doc.y), longitude: Number(doc.x), imageUrl: null, tel: doc.phone || null,
          kakaoPlaceUrl: doc.place_url || null, bookingAvailable: false, bookingGuide: null, bookingUrl: null,
        });
        if (results.length >= limit) break;
      }
    } catch { /* TourAPI 결과는 계속 사용 */ }
  }
  return results;
}

function firstHttpUrl(value: string) {
  return value.match(/https?:\/\/[^\s<>"']+/i)?.[0] ?? null;
}

async function enrichBooking(place: any) {
  if (!place.id || place.contentTypeId === "kakao") return place;
  try {
    const body = await tourRequest("detailIntro2", {
      contentId: String(place.id), contentTypeId: String(place.contentTypeId), numOfRows: "10", pageNo: "1",
    });
    const detail = itemsFrom(body)[0] ?? {};
    const candidates = [
      detail.bookingplace, detail.reservation, detail.eventhomepage, detail.homepage,
      detail.discountinfofestival, detail.usetimefestival, detail.playtime,
    ].map(textOf).filter(Boolean);
    const allText = Object.values(detail).map(textOf).filter(Boolean).join(" ");
    const hasSignal = candidates.length > 0 || /(예약|예매|티켓|입장권|사전\s*신청|온라인\s*신청)/i.test(allText);
    if (!hasSignal) return place;
    const guide = candidates[0] || allText.slice(0, 500);
    return { ...place, bookingAvailable: true, bookingGuide: guide, bookingUrl: firstHttpUrl(guide) };
  } catch {
    return place;
  }
}

async function mapWithConcurrency<T, R>(values: T[], concurrency: number, mapper: (value: T) => Promise<R>) {
  const output = new Array<R>(values.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= values.length) return;
      output[index] = await mapper(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return output;
}

async function handleTourPlaces(url: URL) {
  const mode = url.searchParams.get("mode") || "places";
  const region = url.searchParams.get("region") || "전국";
  const areaCode = regionCodes[region] || "";
  if (mode === "subregions") {
    if (!areaCode) return json({ subregions: [] });
    const body = await tourRequest("areaCode2", { areaCode, numOfRows: "100", pageNo: "1" });
    const subregions = itemsFrom(body).map((item) => ({ code: textOf(item.code), name: textOf(item.name) }));
    return json({ subregions });
  }

  const category = url.searchParams.get("category") || "전체";
  const detailType = url.searchParams.get("detailType") || "전체";
  const sigunguCode = url.searchParams.get("sigunguCode") || "";
  const bookingOnly = url.searchParams.get("bookingOnly") === "true";
  const requestedPage = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.max(1, Math.min(30, Number(url.searchParams.get("pageSize") || 12)));
  const sourceRows = bookingOnly ? 100 : Math.max(pageSize * 3, 36);
  const params: Record<string, string> = {
    arrange: "Q", numOfRows: String(sourceRows), pageNo: bookingOnly ? "1" : String(requestedPage),
  };
  if (areaCode) params.areaCode = areaCode;
  if (sigunguCode) params.sigunguCode = sigunguCode;
  if (categoryTypes[category]) params.contentTypeId = categoryTypes[category];

  const body = await tourRequest("areaBasedList2", params);
  let places = itemsFrom(body).map((item) => transformPlace(item, category)).filter((place) => place.name);

  if (category === "카페") {
    places = places.filter((place) => /카페|커피|베이커리|다방|스타벅스|투썸|이디야|컴포즈|메가|빽다방|할리스|커피빈|폴바셋|파스쿠찌|엔제리너스/i.test(`${place.name} ${place.address ?? ""}`));
  }
  places = places.filter((place) => matchesDetail(place, detailType));

  if (category === "카페" && detailType === "프랜차이즈" && places.length < pageSize) {
    const cityName = url.searchParams.get("city") || "";
    const supplements = await kakaoFranchisePlaces(region, cityName, pageSize - places.length);
    const seen = new Set(places.map((place) => `${place.name}|${place.address ?? ""}`));
    places.push(...supplements.filter((place) => !seen.has(`${place.name}|${place.address ?? ""}`)));
  }

  if (bookingOnly) {
    const enriched = await mapWithConcurrency(places.slice(0, 80), 4, enrichBooking);
    places = enriched.filter((place) => place.bookingAvailable);
  }

  const totalCount = bookingOnly ? places.length : Number(body.totalCount || places.length);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (bookingOnly) {
    const start = (requestedPage - 1) * pageSize;
    places = places.slice(start, start + pageSize);
  } else {
    places = places.slice(0, pageSize);
  }

  return json({
    places,
    pagination: { page: requestedPage, pageSize, totalCount, totalPages },
    bookingOnly,
    scannedCount: bookingOnly ? Math.min(80, itemsFrom(body).length) : places.length,
    source: "supabase-edge-tourapi",
  });
}

function normalizeTrendPlace(row: any, rank: number) {
  const category = row.category || "관광지";
  const score = Number(row.score || 0);
  return {
    id: String(row.id), rank, category,
    location: [row.region, row.city].filter(Boolean).join(" ") || "전국",
    title: row.name,
    description: row.address || `${category} 실시간 인기 장소`,
    imageUrl: row.image_url || null,
    icon: categoryIcons[category] || "⌖",
    popularityScore: Math.max(1, score),
    viewCount: Number(row.activity_count || 0), detailCount: 0, outboundCount: 0, favoriteCount: 0,
    source: "activity",
  };
}

async function handleTrendingPlaces(req: Request, url: URL) {
  const admin = supabaseAdmin();
  if (req.method === "POST") {
    const body = await req.json();
    const authorization = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authorization) {
      const { data } = await callerClient(req).auth.getUser();
      userId = data.user?.id ?? null;
    }
    const { error } = await admin.from("place_activity_events").insert({
      user_id: userId, visitor_id: String(body.visitorId || "anonymous").slice(0, 120),
      source_id: String(body.id || "unknown").slice(0, 160), name: String(body.name || "이름 없는 장소").slice(0, 160),
      region: String(body.region || "전국").slice(0, 40), city: body.city ? String(body.city).slice(0, 80) : null,
      category: String(body.category || "관광지").slice(0, 40), address: body.address ? String(body.address).slice(0, 300) : null,
      image_url: body.imageUrl ? String(body.imageUrl).slice(0, 1200) : null,
      event_type: ["view", "detail", "outbound", "favorite"].includes(body.eventType) ? body.eventType : "view",
    });
    if (error) throw error;
    return json({ success: true });
  }
  const limit = Math.max(1, Math.min(20, Number(url.searchParams.get("limit") || 8)));
  const { data, error } = await admin.rpc("trending_places", { p_limit: limit });
  if (error) throw error;
  let rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) {
    try {
      const tourBody = await tourRequest("areaBasedList2", { arrange: "Q", numOfRows: String(limit), pageNo: "1", contentTypeId: "12" });
      rows = itemsFrom(tourBody).map((item) => ({
        id: textOf(item.contentid), name: textOf(item.title), region: textOf(item.addr1).split(/\s+/)[0] || "전국",
        city: textOf(item.addr1).split(/\s+/)[1] || null, category: "관광지", address: textOf(item.addr1),
        image_url: textOf(item.firstimage) || null, score: 50, activity_count: 0,
      }));
    } catch { rows = []; }
  }
  return json({ updatedAt: new Date().toISOString(), realtimeEnabled: rows.length > 0, places: rows.map(normalizeTrendPlace) });
}

async function handleTrendingKeywords(req: Request, url: URL) {
  const admin = supabaseAdmin();
  if (req.method === "POST") {
    const body = await req.json();
    const keyword = String(body.keyword || "").trim().slice(0, 80);
    if (!keyword) return json({ error: "검색어가 비어 있습니다." }, 400);
    const { error } = await admin.from("keyword_search_events").insert({
      visitor_id: String(body.visitorId || "anonymous").slice(0, 120), keyword,
      source: body.source === "trend" ? "trend" : "search",
    });
    if (error) throw error;
    return json({ success: true });
  }
  const limit = Math.max(1, Math.min(30, Number(url.searchParams.get("limit") || 10)));
  const { data, error } = await admin.rpc("trending_keywords", { p_limit: limit });
  if (error) throw error;
  const keywords = (Array.isArray(data) ? data : []).map((row: any, index: number) => ({
    rank: index + 1, keyword: row.keyword, searchCount: Number(row.search_count || 0), trend: "same",
  }));
  return json({ updatedAt: new Date().toISOString(), realtimeEnabled: true, keywords });
}

async function handleAccountDelete(req: Request) {
  const caller = callerClient(req);
  const { data, error } = await caller.auth.getUser();
  if (error || !data.user) return json({ error: "로그인이 필요합니다." }, 401);
  const admin = supabaseAdmin();
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) throw deleteError;
  return json({ success: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const path = routePath(url);
  try {
    if (path === "/" || path === "/actuator/health") return json({ status: "UP", runtime: "supabase-edge" });
    if (path === "/api/public/tour/places" && req.method === "GET") return await handleTourPlaces(url);
    if (path === "/api/public/trending-places" && ["GET", "POST"].includes(req.method)) return await handleTrendingPlaces(req, url);
    if (path === "/api/public/trending-keywords" && ["GET", "POST"].includes(req.method)) return await handleTrendingKeywords(req, url);
    if (path === "/api/web/account" && req.method === "DELETE") return await handleAccountDelete(req);
    return json({ error: "지원하지 않는 Supabase API 경로입니다.", path }, 404);
  } catch (error) {
    console.error("KO-PICK Edge Function error", error);
    return json({ error: error instanceof Error ? error.message : "서버 요청을 처리하지 못했습니다." }, 500);
  }
});
