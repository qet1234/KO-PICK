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

const stripHtml = (value = "") => value.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&");

function buildQueries(params: URLSearchParams) {
  const region = params.get("region") || "서울";
  const relationship = params.get("relationship") || "개인";
  const category = params.get("category") || "카페";
  const mood = params.get("mood") || "조용한";
  const indoor = params.get("indoor") === "실내" ? "실내" : "";

  const relationshipKeyword: Record<string, string> = {
    개인: "혼자 가기 좋은",
    커플: "데이트",
    친구: "친구 모임",
    가족: "가족",
  };

  return [
    `${region} ${relationshipKeyword[relationship] || ""} ${mood} ${indoor} ${category}`.trim(),
    `${region} ${mood} ${category}`.trim(),
    `${region} 인기 ${category}`.trim(),
  ];
}

function scoreItem(item: NaverItem, index: number, params: URLSearchParams) {
  const text = `${stripHtml(item.title)} ${item.category} ${item.description} ${item.address}`;
  const relationship = params.get("relationship") || "개인";
  const mood = params.get("mood") || "조용한";
  const indoor = params.get("indoor") || "실내";
  const category = params.get("category") || "카페";
  let score = 100 - index * 4;

  const relationTerms: Record<string, string[]> = {
    개인: ["혼밥", "혼자", "조용"],
    커플: ["데이트", "분위기", "전망"],
    친구: ["모임", "단체", "활기"],
    가족: ["가족", "아이", "공원"],
  };

  if (text.includes(category)) score += 18;
  if (text.includes(mood.replace("한", ""))) score += 12;
  if (indoor === "실내" && /(카페|식당|박물관|전시|쇼핑)/.test(text)) score += 8;
  if ((relationTerms[relationship] || []).some((term) => text.includes(term))) score += 15;

  return Math.min(100, score);
}

export async function GET(request: NextRequest) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const queries = buildQueries(request.nextUrl.searchParams);
  const responses = await Promise.all(
    queries.map(async (query) => {
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
      });

      if (!response.ok) return [] as NaverItem[];
      const data = (await response.json()) as { items?: NaverItem[] };
      return data.items || [];
    })
  );

  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  let index = 0;

  for (const item of responses.flat()) {
    const name = stripHtml(item.title);
    const address = item.roadAddress || item.address;
    const key = `${name}-${address}`;
    if (!name || !address || seen.has(key)) continue;
    seen.add(key);

    const score = scoreItem(item, index++, request.nextUrl.searchParams);
    const mapQuery = encodeURIComponent(`${name} ${address}`);
    const reason = score >= 90 ? "선택한 상황과 분위기에 가장 잘 맞아요." : score >= 80 ? "거리와 목적 조건이 잘 맞는 장소예요." : "현재 조건에서 균형 있게 추천되는 장소예요.";

    candidates.push({
      id: key,
      name,
      category: item.category || request.nextUrl.searchParams.get("category") || "장소",
      address,
      description: stripHtml(item.description),
      mapUrl: `https://map.naver.com/p/search/${mapQuery}`,
      reservationUrl: `https://map.naver.com/p/search/${mapQuery}`,
      score,
      reason,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return NextResponse.json({ queries, items: candidates.slice(0, 9) });
}
