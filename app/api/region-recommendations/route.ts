import { NextRequest, NextResponse } from "next/server";

type NaverLocalItem = {
  title?: string;
  link?: string;
  category?: string;
  description?: string;
  telephone?: string;
  address?: string;
  roadAddress?: string;
};

const CATEGORY_KEYWORDS: Record<string, string> = {
  전체: "가볼만한 곳",
  맛집: "맛집",
  카페: "카페",
  축제: "축제 행사",
  관광지: "관광지 명소",
};

const stripHtml = (value = "") =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

async function searchNaver(
  query: string,
  clientId: string,
  clientSecret: string
): Promise<NaverLocalItem[]> {
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
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return [];

    const payload = (await response.json()) as { items?: NaverLocalItem[] };
    return payload.items ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "네이버 지역 검색 API 설정이 필요합니다." },
        { status: 503 }
      );
    }

    const region = (request.nextUrl.searchParams.get("region") || "서울").slice(0, 30);
    const category = request.nextUrl.searchParams.get("category") || "전체";
    const keyword = CATEGORY_KEYWORDS[category] || CATEGORY_KEYWORDS.전체;
    const queries = [
      `${region} ${keyword}`,
      `${region} 인기 ${keyword}`,
    ];

    const settled = await Promise.allSettled(
      queries.map((query) => searchNaver(query, clientId, clientSecret))
    );

    const rawItems = settled.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );

    const seen = new Set<string>();
    const items = rawItems
      .map((item) => {
        const name = stripHtml(item.title);
        const roadAddress = stripHtml(item.roadAddress);
        const address = roadAddress || stripHtml(item.address);
        const key = `${name}|${address}`;

        if (!name || !address || seen.has(key)) return null;
        seen.add(key);

        const mapQuery = encodeURIComponent(`${name} ${address}`);
        return {
          id: key,
          name,
          category: stripHtml(item.category) || category,
          address,
          telephone: stripHtml(item.telephone),
          description: stripHtml(item.description),
          mapUrl: `https://map.naver.com/p/search/${mapQuery}`,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 8);

    if (items.length === 0) {
      return NextResponse.json(
        {
          error: "선택한 지역의 장소를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      region,
      category,
      query: queries[0],
      updatedAt: new Date().toISOString(),
      items,
    });
  } catch (error) {
    console.error("region recommendations API error", error);
    return NextResponse.json(
      { error: "추천 서버 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
