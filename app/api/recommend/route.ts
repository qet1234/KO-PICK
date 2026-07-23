import { NextRequest, NextResponse } from "next/server";

type NaverItem = {
  title: string;
  link: string;
  category: string;
  description: string;
  telephone?: string;
  address: string;
  roadAddress: string;
  mapx?: string;
  mapy?: string;
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
};

const NATIONWIDE_REGIONS = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const stripHtml = (value = "") => value.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&");

function preferenceKeywords(params: URLSearchParams) {
  const values = [
    params.get("pace"),
    params.get("crowd"),
    params.get("discovery"),
    params.get("activity"),
    params.get("foodStyle"),
  ].filter(Boolean);

  const map: Record<string, string> = {
    "여유롭게": "여유로운",
    "알차게": "볼거리 많은",
    "한적한 곳": "조용한 한적한",
    "사람 많은 곳": "핫플 인기",
    "검증된 인기 장소": "인기 유명",
    "새로운 숨은 장소": "숨은 명소 이색",
    "휴식 중심": "편안한 휴식",
    "체험 중심": "체험 액티비티",
    "익숙한 취향": "대표 메뉴",
    "새로운 맛 도전": "이색 메뉴",
  };

  return values.map((value) => map[value as string] || value).join(" ");
}

function buildQueries(params: URLSearchParams) {
  const scope = params.get("scope") || "내 지역";
  const region = params.get("region") || "서울";
  const relationship = params.get("relationship") || "개인";
  const category = params.get("category") || "카페";
  const mood = params.get("mood") || "조용한";
  const indoor = params.get("indoor") === "실내" ? "실내" : "";
  const preference = preferenceKeywords(params);

  const relationshipKeyword: Record<string, string> = {
    개인: "혼자 가기 좋은",
    커플: "데이트",
    친구: "친구 모임",
    가족: "가족",
  };

  if (scope === "전국") {
    return NATIONWIDE_REGIONS.map((regionName) =>
      `${regionName} ${relationshipKeyword[relationship] || ""} ${mood} ${indoor} ${preference} ${category}`.trim()
    );
  }

  return [
    `${region} ${relationshipKeyword[relationship] || ""} ${mood} ${indoor} ${preference} ${category}`.trim(),
    `${region} ${preference} ${mood} ${category}`.trim(),
    `${region} 인기 ${category}`.trim(),
  ];
}

function scoreItem(item: NaverItem, index: number, params: URLSearchParams) {
  const text = `${stripHtml(item.title)} ${item.category} ${item.description} ${item.address}`;
  const relationship = params.get("relationship") || "개인";
  const mood = params.get("mood") || "조용한";
  const indoor = params.get("indoor") || "실내";
  const category = params.get("category") || "카페";
  let score = 76 - Math.min(index, 12);

  const relationTerms: Record<string, string[]> = {
    개인: ["혼밥", "혼자", "조용"],
    커플: ["데이트", "분위기", "전망"],
    친구: ["모임", "단체", "활기"],
    가족: ["가족", "아이", "공원"],
  };

  const preferenceTerms: Record<string, string[]> = {
    "여유롭게": ["여유", "산책", "정원", "휴식"],
    "알차게": ["체험", "복합", "테마", "볼거리"],
    "한적한 곳": ["조용", "한적", "숨은", "정원"],
    "사람 많은 곳": ["핫플", "인기", "유명", "대표"],
    "검증된 인기 장소": ["인기", "유명", "대표", "명소"],
    "새로운 숨은 장소": ["이색", "숨은", "신상", "독특"],
    "휴식 중심": ["휴식", "카페", "공원", "산책"],
    "체험 중심": ["체험", "액티비티", "전시", "축제"],
    "익숙한 취향": ["대표", "전통", "한식", "유명"],
    "새로운 맛 도전": ["이색", "퓨전", "세계", "신메뉴"],
  };

  if (text.includes(category)) score += 8;
  if (text.includes(mood.replace("한", ""))) score += 6;
  if (indoor === "실내" && /(카페|식당|박물관|전시|쇼핑)/.test(text)) score += 5;
  if ((relationTerms[relationship] || []).some((term) => text.includes(term))) score += 6;

  for (const key of ["pace", "crowd", "discovery", "activity", "foodStyle"]) {
    const selected = params.get(key) || "";
    if ((preferenceTerms[selected] || []).some((term) => text.includes(term))) score += 3;
  }

  return Math.max(65, Math.min(100, score));
}

function recommendationReason(score: number, params: URLSearchParams) {
  const discovery = params.get("discovery") || "검증된 인기 장소";
  const crowd = params.get("crowd") || "한적한 곳";
  if (score >= 92) return `${crowd}과 ${discovery} 성향에 가장 잘 맞는 장소예요.`;
  if (score >= 84) return "저장한 취향과 오늘의 분위기가 고르게 잘 맞아요.";
  return "현재 선택한 범위와 상황을 고려했을 때 부담 없이 선택하기 좋아요.";
}

async function fetchNaverItems(query: string, clientId: string, clientSecret: string): Promise<NaverItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);

  try {
    const url = new URL("https://openapi.naver.com/v1/search/local.json");
    url.searchParams.set("query", query);
    url.searchParams.set("display", "5");
    url.searchParams.set("sort", "comment");

    const response = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return [];
    const data = (await response.json()) as { items?: NaverItem[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchInBatches(queries: string[], clientId: string, clientSecret: string) {
  const results: NaverItem[][] = [];
  const batchSize = 4;

  for (let index = 0; index < queries.length; index += batchSize) {
    const batch = queries.slice(index, index + batchSize);
    const settled = await Promise.allSettled(
      batch.map((query) => fetchNaverItems(query, clientId, clientSecret))
    );

    for (const result of settled) {
      results.push(result.status === "fulfilled" ? result.value : []);
    }
  }

  return results;
}

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "네이버 장소 검색 설정이 완료되지 않았습니다." },
        { status: 503 }
      );
    }

    const params = request.nextUrl.searchParams;
    const requestedCount = Math.min(48, Math.max(3, Number.parseInt(params.get("resultCount") || "12", 10) || 12));
    const queries = buildQueries(params);
    const responses = await fetchInBatches(queries, clientId, clientSecret);

    const seen = new Set<string>();
    const candidates: Candidate[] = [];
    let index = 0;

    for (const item of responses.flat()) {
      const name = stripHtml(item.title);
      const address = item.roadAddress || item.address;
      const key = `${name}-${address}`;
      if (!name || !address || seen.has(key)) continue;
      seen.add(key);

      const score = scoreItem(item, index++, params);
      const mapQuery = encodeURIComponent(`${name} ${address}`);

      candidates.push({
        id: key,
        name,
        category: item.category || params.get("category") || "장소",
        address,
        description: stripHtml(item.description),
        mapUrl: `https://map.naver.com/p/search/${mapQuery}`,
        reservationUrl: `https://map.naver.com/p/search/${mapQuery}`,
        score,
        reason: recommendationReason(score, params),
      });
    }

    candidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ko"));

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "현재 조건에서 장소를 찾지 못했습니다. 카테고리나 성향을 조금 바꿔보세요." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      scope: params.get("scope") || "내 지역",
      totalCount: candidates.length,
      items: candidates.slice(0, requestedCount),
      partial: responses.some((items) => items.length === 0),
    });
  } catch (error) {
    console.error("recommend API error", error);
    return NextResponse.json(
      { error: "추천 장소를 불러오는 중 일시적인 오류가 발생했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
