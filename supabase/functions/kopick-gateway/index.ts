const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const PROJECT_REF = "vbwaruzncfaxnjyybudm";
const CORE_BASE = `https://${PROJECT_REF}.supabase.co/functions/v1/kopick-core`;

const categoryKeywords: Record<string, string> = {
  전체: "가볼만한 곳",
  음식: "맛집",
  맛집: "맛집",
  카페: "카페",
  축제: "축제 행사",
  관광지: "관광지 명소",
};

const nationwideRegions = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const subregions: Record<string, string[]> = {
  서울: ["종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구", "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구", "강동구"],
  부산: ["중구", "서구", "동구", "영도구", "부산진구", "동래구", "남구", "북구", "해운대구", "사하구", "금정구", "강서구", "연제구", "수영구", "사상구", "기장군"],
  대구: ["중구", "동구", "서구", "남구", "북구", "수성구", "달서구", "달성군", "군위군"],
  인천: ["중구", "동구", "미추홀구", "연수구", "남동구", "부평구", "계양구", "서구", "강화군", "옹진군"],
  광주: ["동구", "서구", "남구", "북구", "광산구"],
  대전: ["동구", "중구", "서구", "유성구", "대덕구"],
  울산: ["중구", "남구", "동구", "북구", "울주군"],
  세종: ["세종시"],
  경기: ["수원시", "성남시", "고양시", "용인시", "부천시", "안산시", "안양시", "남양주시", "화성시", "평택시", "의정부시", "시흥시", "파주시", "김포시", "광주시", "광명시", "군포시", "하남시", "오산시", "양주시", "이천시", "구리시", "안성시", "포천시", "의왕시", "여주시", "동두천시", "과천시", "가평군", "양평군", "연천군"],
  강원: ["춘천시", "원주시", "강릉시", "동해시", "태백시", "속초시", "삼척시", "홍천군", "횡성군", "영월군", "평창군", "정선군", "철원군", "화천군", "양구군", "인제군", "고성군", "양양군"],
  충북: ["청주시", "충주시", "제천시", "보은군", "옥천군", "영동군", "증평군", "진천군", "괴산군", "음성군", "단양군"],
  충남: ["천안시", "공주시", "보령시", "아산시", "서산시", "논산시", "계룡시", "당진시", "금산군", "부여군", "서천군", "청양군", "홍성군", "예산군", "태안군"],
  전북: ["전주시", "군산시", "익산시", "정읍시", "남원시", "김제시", "완주군", "진안군", "무주군", "장수군", "임실군", "순창군", "고창군", "부안군"],
  전남: ["목포시", "여수시", "순천시", "나주시", "광양시", "담양군", "곡성군", "구례군", "고흥군", "보성군", "화순군", "장흥군", "강진군", "해남군", "영암군", "무안군", "함평군", "영광군", "장성군", "완도군", "진도군", "신안군"],
  경북: ["포항시", "경주시", "김천시", "안동시", "구미시", "영주시", "영천시", "상주시", "문경시", "경산시", "의성군", "청송군", "영양군", "영덕군", "청도군", "고령군", "성주군", "칠곡군", "예천군", "봉화군", "울진군", "울릉군"],
  경남: ["창원시", "진주시", "통영시", "사천시", "김해시", "밀양시", "거제시", "양산시", "의령군", "함안군", "창녕군", "고성군", "남해군", "하동군", "산청군", "함양군", "거창군", "합천군"],
  제주: ["제주시", "서귀포시"],
};

type NaverItem = {
  title?: string;
  link?: string;
  category?: string;
  description?: string;
  telephone?: string;
  address?: string;
  roadAddress?: string;
  mapx?: string | number;
  mapy?: string | number;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function routePath(url: URL) {
  const marker = "/kopick-api";
  const index = url.pathname.indexOf(marker);
  return index >= 0 ? url.pathname.slice(index + marker.length) || "/" : url.pathname;
}

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function forwardedHeaders(request: Request) {
  const headers = new Headers();
  for (const name of ["authorization", "apikey", "content-type", "x-client-info"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

async function proxyCore(request: Request, url: URL) {
  const path = routePath(url);
  const target = `${CORE_BASE}${path}${url.search}`;
  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
  return fetch(target, {
    method,
    headers: forwardedHeaders(request),
    body,
    redirect: "manual",
  });
}

function coordinate(value: unknown, axis: "x" | "y") {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const normalized = Math.abs(number) > 1000 ? number / 10_000_000 : number;
  if (axis === "x" && normalized >= 124 && normalized <= 132) return normalized;
  if (axis === "y" && normalized >= 32 && normalized <= 40) return normalized;
  return null;
}

async function searchNaver(query: string, clientId: string, clientSecret: string) {
  const endpoint = new URL("https://openapi.naver.com/v1/search/local.json");
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("display", "5");
  endpoint.searchParams.set("sort", "comment");
  const response = await fetch(endpoint, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`네이버 지역검색 오류 (${response.status}) ${detail.slice(0, 160)}`.trim());
  }
  const payload = await response.json() as { items?: NaverItem[] };
  return Array.isArray(payload.items) ? payload.items : [];
}

async function naverFallback(url: URL, fallbackReason: string) {
  const clientId = Deno.env.get("NAVER_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("NAVER_CLIENT_SECRET")?.trim();
  if (!clientId || !clientSecret) {
    return json({ error: fallbackReason || "장소 제공 서버가 일시적으로 혼잡합니다." }, 503);
  }

  const mode = url.searchParams.get("mode") || "places";
  const region = url.searchParams.get("region") || "전국";
  if (mode === "subregions") {
    return json({
      subregions: (subregions[region] ?? []).map((name) => ({ code: name, name })),
      source: "static-region-index",
    });
  }

  const category = url.searchParams.get("category") || "전체";
  const detailType = url.searchParams.get("detailType") || "전체";
  const city = url.searchParams.get("sigunguCode") || "";
  const requestedPage = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.max(1, Math.min(12, Number(url.searchParams.get("pageSize") || 12)));
  const keyword = detailType !== "전체" ? detailType : (categoryKeywords[category] || categoryKeywords.전체);

  const targets = region === "전국"
    ? Array.from({ length: 3 }, (_, index) => nationwideRegions[((requestedPage - 1) * 3 + index) % nationwideRegions.length])
    : [region];
  const queries = targets.flatMap((target) => {
    const base = [target, city, keyword].filter(Boolean).join(" ");
    return [base, `${target} 인기 ${keyword}`];
  });

  const settled = await Promise.allSettled(
    queries.slice(0, 6).map((query) => searchNaver(query, clientId, clientSecret)),
  );
  const errors = settled
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason));
  const rawItems = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);

  const seen = new Set<string>();
  const places = rawItems.flatMap((item) => {
    const name = cleanText(item.title);
    const address = cleanText(item.roadAddress) || cleanText(item.address);
    const longitude = coordinate(item.mapx, "x");
    const latitude = coordinate(item.mapy, "y");
    const key = `${name}|${address}`;
    if (!name || !address || longitude == null || latitude == null || seen.has(key)) return [];
    seen.add(key);
    const addressParts = address.split(/\s+/);
    return [{
      id: `naver-${encodeURIComponent(key).slice(0, 180)}`,
      contentTypeId: "naver-local",
      name,
      title: name,
      region: addressParts[0] || region,
      city: addressParts[1] || null,
      location: addressParts.slice(0, 2).join(" ") || region,
      category: category === "전체" ? (cleanText(item.category) || "관광지") : category,
      address,
      latitude,
      longitude,
      imageUrl: null,
      tel: cleanText(item.telephone) || null,
      kakaoPlaceUrl: null,
      naverPlaceUrl: item.link || `https://map.naver.com/p/search/${encodeURIComponent(`${name} ${address}`)}`,
      bookingAvailable: false,
      bookingGuide: null,
      bookingUrl: null,
    }];
  }).slice(0, pageSize);

  if (places.length === 0) {
    return json({
      error: errors[0] || fallbackReason || "장소 제공 서버가 일시적으로 혼잡합니다.",
    }, 503);
  }

  return json({
    places,
    pagination: {
      page: requestedPage,
      pageSize,
      totalCount: places.length,
      totalPages: 1,
    },
    bookingOnly: false,
    scannedCount: rawItems.length,
    source: "naver-local-live-fallback",
    fallbackReason,
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(request.url);
  const path = routePath(url);

  try {
    if (path === "/api/public/tour/places" && request.method === "GET") {
      const coreResponse = await proxyCore(request, url);
      if (coreResponse.ok) return coreResponse;
      const payload = await coreResponse.clone().json().catch(() => null) as { error?: string } | null;
      const reason = payload?.error || `TourAPI 응답 오류 (${coreResponse.status})`;
      return await naverFallback(url, reason);
    }
    return await proxyCore(request, url);
  } catch (error) {
    if (path === "/api/public/tour/places" && request.method === "GET") {
      return await naverFallback(url, error instanceof Error ? error.message : "장소 조회 오류");
    }
    return json({ error: error instanceof Error ? error.message : "API 요청을 처리하지 못했습니다." }, 500);
  }
});
