import { NextRequest, NextResponse } from "next/server";

type DiningMode = "회식" | "점심";

type NaverLocalItem = {
  title?: string;
  category?: string;
  address?: string;
  roadAddress?: string;
  mapx?: string;
  mapy?: string;
};

const FOOD_CATEGORY = /음식점|한식|중식|일식|양식|분식|뷔페|카페|베이커리|술집|요리/;
const FOOD_QUERY: Record<string, string> = {
  전체: "맛집",
  한식: "한식",
  "고기·구이": "고기 구이",
  일식: "일식",
  중식: "중식",
  양식: "양식",
  해산물: "해산물",
  주점: "회식 주점",
};
const MAX_RESULTS = 10;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const client = request.headers.get("x-real-ip")?.trim() || forwarded || "unknown";
  const now = Date.now();
  const current = rateBuckets.get(client);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(client, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 20;
}

function stripHtml(value = "") {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function coordinates(item: NaverLocalItem) {
  const rawLongitude = Number(item.mapx);
  const rawLatitude = Number(item.mapy);
  if (!Number.isFinite(rawLongitude) || !Number.isFinite(rawLatitude)) return null;

  const longitude = rawLongitude > 1_000_000 ? rawLongitude / 10_000_000 : rawLongitude;
  const latitude = rawLatitude > 1_000_000 ? rawLatitude / 10_000_000 : rawLatitude;
  if (longitude < 124 || longitude > 132 || latitude < 32 || latitude > 40) return null;

  return { latitude, longitude };
}

function makeQueries({
  mode,
  region,
  district,
  officeArea,
  foodType,
  headcount,
  budget,
}: {
  mode: DiningMode;
  region: string;
  district: string;
  officeArea: string;
  foodType: string;
  headcount: string;
  budget: string;
}) {
  const location = [region, district === "전체" ? "" : district, officeArea]
    .filter(Boolean)
    .join(" ");
  const food = FOOD_QUERY[foodType] ?? FOOD_QUERY.전체;
  const purpose = mode === "회식" ? `${headcount} 회식` : "직장인 점심";

  return Array.from(new Set([
    `${location} ${food} ${purpose} ${budget}`,
    `${location} ${food} ${budget}`,
    `${location} ${food} ${purpose}`,
  ].map((query) => query.replace(/\s+/g, " ").trim())));
}

async function searchNaver(query: string, clientId: string, clientSecret: string) {
  const url = new URL("https://openapi.naver.com/v1/search/local.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", "5");
  url.searchParams.set("sort", "random");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`NAVER_LOCAL_${response.status}`);
    const payload = (await response.json()) as { items?: NaverLocalItem[] };
    return payload.items ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  if (isRateLimited(request)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }

  const mode = request.nextUrl.searchParams.get("mode") === "점심" ? "점심" : "회식";
  const region = (request.nextUrl.searchParams.get("region") || "서울").trim().slice(0, 20);
  const district = (request.nextUrl.searchParams.get("district") || "전체").trim().slice(0, 30);
  const officeArea = (request.nextUrl.searchParams.get("officeArea") || "").trim().slice(0, 60);
  const foodType = (request.nextUrl.searchParams.get("foodType") || "전체").trim().slice(0, 30);
  const headcount = (request.nextUrl.searchParams.get("headcount") || "5~8명").trim().slice(0, 20);
  const budget = (request.nextUrl.searchParams.get("budget") || "").trim().slice(0, 30);

  if (!budget) {
    return NextResponse.json({ error: "금액대를 선택해 주세요." }, { status: 400 });
  }

  const clientId = process.env.NAVER_SEARCH_CLIENT_ID?.trim() || process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET?.trim() || process.env.NAVER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "네이버 지역검색 API 설정이 필요합니다." },
      { status: 503, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }

  const queries = makeQueries({ mode, region, district, officeArea, foodType, headcount, budget });
  const found = new Map<string, NaverLocalItem>();

  try {
    for (const query of queries) {
      const items = await searchNaver(query, clientId, clientSecret);
      for (const item of items) {
        const name = stripHtml(item.title);
        const address = stripHtml(item.roadAddress) || stripHtml(item.address);
        const point = coordinates(item);
        if (!name || !address || !point || !FOOD_CATEGORY.test(stripHtml(item.category))) continue;
        found.set(`${name}|${address}`, item);
        if (found.size >= MAX_RESULTS) break;
      }
      if (found.size >= MAX_RESULTS) break;
    }

    const places = Array.from(found.values()).map((item, index) => {
      const point = coordinates(item)!;
      return {
        id: `naver-dining-${index}-${item.mapx}-${item.mapy}`,
        name: stripHtml(item.title),
        region,
        city: district === "전체" ? null : district,
        category: stripHtml(item.category) || "음식점",
        address: stripHtml(item.roadAddress) || stripHtml(item.address),
        latitude: point.latitude,
        longitude: point.longitude,
      };
    });

    return NextResponse.json(
      { places, query: queries[0], budget },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const permissionError = ["NAVER_LOCAL_401", "NAVER_LOCAL_403"].includes(message);
    return NextResponse.json(
      {
        error: permissionError
          ? "네이버 개발자센터 애플리케이션에서 검색 API 권한을 활성화해 주세요."
          : "네이버 음식점 검색 중 오류가 발생했습니다.",
      },
      {
        status: permissionError ? 503 : 502,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      },
    );
  }
}
