import { NextRequest, NextResponse } from "next/server";

type TourPlace = {
  id?: string | number;
  contentTypeId?: string | number;
  name?: string;
  title?: string;
  category?: string;
  address?: string | null;
  region?: string;
  city?: string | null;
  latitude?: number | string;
  longitude?: number | string;
};

type Candidate = {
  id: string;
  name: string;
  category: string;
  address: string;
  description: string;
  mapUrl: string;
  reservationUrl: string;
  score: number;
  reason: string;
  source: "한국관광공사 TourAPI";
};

const NATIONWIDE_REGIONS = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
] as const;

function tourCategory(value: string) {
  return value === "맛집" ? "음식" : value;
}

function serviceUrl(path: string) {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  if (!projectUrl) throw new Error("추천 데이터 서버가 설정되지 않았습니다.");
  return `${projectUrl}/functions/v1/kopick-api${path}`;
}

async function fetchTourPlaces(region: string, category: string, pageSize: number) {
  const query = new URLSearchParams({
    region,
    category,
    page: "1",
    pageSize: String(Math.max(1, Math.min(30, pageSize))),
  });
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const response = await fetch(serviceUrl(`/api/public/tour/places?${query}`), {
    headers: publishableKey ? { apikey: publishableKey } : undefined,
    next: { revalidate: 600 },
  });
  const payload = await response.json().catch(() => null) as {
    places?: TourPlace[];
    error?: string;
  } | null;
  if (!response.ok) throw new Error(payload?.error || "TourAPI 장소 조회에 실패했습니다.");
  return Array.isArray(payload?.places) ? payload.places : [];
}

async function loadCandidatePool(scope: string, region: string, category: string) {
  if (scope !== "전국" && region !== "전국") {
    return fetchTourPlaces(region, category, 30);
  }

  const groups: TourPlace[][] = [];
  for (let index = 0; index < NATIONWIDE_REGIONS.length; index += 4) {
    const batch = NATIONWIDE_REGIONS.slice(index, index + 4);
    const settled = await Promise.allSettled(
      batch.map((regionName) => fetchTourPlaces(regionName, category, 3)),
    );
    for (const result of settled) {
      if (result.status === "fulfilled") groups.push(result.value);
    }
  }
  return groups.flat();
}

function scorePlace(place: TourPlace, index: number, params: URLSearchParams) {
  const text = `${place.name ?? place.title ?? ""} ${place.category ?? ""} ${place.address ?? ""}`;
  const relationship = params.get("relationship") || "개인";
  const mood = params.get("mood") || "조용한";
  const category = tourCategory(params.get("category") || "카페");
  let score = 72 - Math.min(index, 8);

  const terms: Record<string, string[]> = {
    개인: ["혼밥", "산책", "공원", "카페"],
    커플: ["데이트", "전망", "공원", "카페"],
    친구: ["체험", "축제", "테마", "맛집"],
    가족: ["가족", "공원", "박물관", "체험"],
    조용한: ["산책", "정원", "숲", "한옥", "박물관"],
    활기찬: ["축제", "시장", "체험", "테마"],
    감성적인: ["전망", "한옥", "미술관", "해변"],
    "뷰가 좋은": ["전망", "해변", "바다", "산", "호수"],
  };

  if (text.includes(category)) score += 10;
  if ((terms[relationship] ?? []).some((term) => text.includes(term))) score += 7;
  if ((terms[mood] ?? []).some((term) => text.includes(term))) score += 6;
  if (params.get("indoor") === "실내" && /(카페|식당|박물관|미술관|전시)/.test(text)) {
    score += 5;
  }
  return Math.max(65, Math.min(96, score));
}

function reasonFor(score: number, params: URLSearchParams) {
  const relationship = params.get("relationship") || "개인";
  const mood = params.get("mood") || "조용한";
  if (score >= 90) return `${relationship} 일정과 ${mood} 분위기 조건에 특히 잘 맞는 장소예요.`;
  if (score >= 82) return "선택한 지역·카테고리와 취향 조건이 고르게 맞아요.";
  return "한국관광공사 장소 중 현재 선택 조건에 가까운 후보예요.";
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const requestedCount = Math.min(
      24,
      Math.max(3, Number.parseInt(params.get("resultCount") || "12", 10) || 12),
    );
    const scope = params.get("scope") || "내 지역";
    const region = params.get("region") || "서울";
    const category = tourCategory(params.get("category") || "카페");
    const rawPlaces = await loadCandidatePool(scope, region, category);
    const seen = new Set<string>();

    const candidates = rawPlaces.flatMap((place, index): Candidate[] => {
      const name = String(place.name ?? place.title ?? "").trim();
      const address = String(place.address ?? "").trim();
      const id = String(place.id ?? `${name}|${address}`);
      const dedupeKey = `${name}|${address}`;
      if (!name || !address || seen.has(dedupeKey)) return [];
      seen.add(dedupeKey);
      const score = scorePlace(place, index, params);
      const mapQuery = encodeURIComponent(`${name} ${address}`);
      return [{
        id,
        name,
        category: String(place.category ?? category),
        address,
        description: "한국관광공사 TourAPI 제공 장소 정보",
        mapUrl: `https://map.naver.com/p/search/${mapQuery}`,
        reservationUrl: "",
        score,
        reason: reasonFor(score, params),
        source: "한국관광공사 TourAPI",
      }];
    });

    candidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ko"));
    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "현재 조건에서 확인된 TourAPI 장소가 없습니다. 지역이나 카테고리를 바꿔보세요." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      scope,
      totalCount: candidates.length,
      items: candidates.slice(0, requestedCount),
      source: "한국관광공사 TourAPI",
      attributionUrl: "https://api.visitkorea.or.kr/",
    });
  } catch (error) {
    console.error("recommend API error", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "추천 장소를 불러오는 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
