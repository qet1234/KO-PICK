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
  아시아: "아시아 음식",
  분식: "분식",
  해산물: "해산물",
  뷔페: "뷔페",
  "카페·디저트": "카페 디저트",
  주점: "회식 주점",
};
const FOOD_DISCOVERY: Record<string, readonly string[]> = {
  전체: ["맛집", "한식", "고기 구이", "일식", "중식", "양식", "분식", "해산물"],
  한식: ["한식", "백반", "국밥", "찌개 전골", "한정식", "닭요리"],
  "고기·구이": ["고기 구이", "삼겹살", "소고기", "갈비", "곱창 막창", "닭갈비"],
  일식: ["일식", "초밥", "돈카츠", "라멘", "우동 소바", "덮밥"],
  중식: ["중식", "짜장 짬뽕", "마라탕", "딤섬", "훠궈", "양꼬치"],
  양식: ["양식", "파스타", "피자", "스테이크", "햄버거", "브런치"],
  아시아: ["아시아 음식", "베트남 음식", "태국 음식", "인도 음식", "동남아 음식"],
  분식: ["분식", "김밥", "떡볶이", "라면", "만두", "샌드위치"],
  해산물: ["해산물", "횟집", "조개구이", "해물탕", "생선구이", "장어"],
  뷔페: ["뷔페", "한식뷔페", "샐러드바", "호텔뷔페", "고기뷔페", "초밥뷔페"],
  "카페·디저트": ["카페 디저트", "카페", "베이커리", "디저트", "아이스크림", "브런치카페"],
  주점: ["회식 주점", "호프 맥주", "이자카야", "포차", "와인바", "전통주 요리주점"],
};
const FOOD_DETAIL_QUERY: Record<string, string> = {
  "백반·가정식": "백반 가정식",
  "국밥·탕": "국밥 탕",
  고기: "고기집",
  초밥: "초밥",
  중화요리: "중화요리",
  파스타: "파스타",
  분식: "분식",
  해산물: "해산물",
  "찌개·전골": "찌개 전골",
  한정식: "한정식",
  "냉면·국수": "냉면 국수",
  "족발·보쌈": "족발 보쌈",
  닭요리: "닭요리",
  삼겹살: "삼겹살",
  소고기: "소고기",
  갈비: "갈비",
  "곱창·막창": "곱창 막창",
  닭갈비: "닭갈비",
  오리구이: "오리구이",
  양꼬치: "양꼬치",
  돈카츠: "돈카츠",
  라멘: "라멘",
  "우동·소바": "우동 소바",
  덮밥: "덮밥",
  이자카야: "이자카야",
  오마카세: "오마카세",
  "짜장·짬뽕": "짜장 짬뽕",
  마라탕: "마라탕",
  딤섬: "딤섬",
  훠궈: "훠궈",
  피자: "피자",
  스테이크: "스테이크",
  햄버거: "햄버거",
  브런치: "브런치",
  멕시칸: "멕시칸 음식",
  베트남: "베트남 음식",
  태국: "태국 음식",
  인도: "인도 음식",
  동남아: "동남아 음식",
  중동: "중동 음식",
  김밥: "김밥",
  떡볶이: "떡볶이",
  라면: "라면",
  만두: "만두",
  샌드위치: "샌드위치",
  "회·사시미": "횟집 사시미",
  조개구이: "조개구이",
  해물탕: "해물탕",
  생선구이: "생선구이",
  장어: "장어구이",
  "대게·킹크랩": "대게 킹크랩",
  한식뷔페: "한식뷔페",
  샐러드바: "샐러드바",
  호텔뷔페: "호텔뷔페",
  고기뷔페: "고기뷔페",
  초밥뷔페: "초밥뷔페",
  카페: "카페",
  베이커리: "베이커리",
  디저트: "디저트 카페",
  아이스크림: "아이스크림",
  브런치카페: "브런치카페",
  "호프·맥주": "호프 맥주",
  포차: "포차",
  와인바: "와인바",
  전통주: "전통주점",
  요리주점: "요리주점",
};
const BUDGET_QUERY: Record<string, readonly string[]> = {
  "1인 1만원 이하": ["1만원 이하", "가성비", "저렴한"],
  "1인 1.5만원 이하": ["15000원 이하", "만원대", "가성비"],
  "1인 2만원 이하": ["2만원 이하", "만원대", "가성비"],
  "1인 3만원 이하": ["3만원 이하", "2만원대", "가성비"],
  "1인 5만원 이하": ["5만원 이하", "3만원대", "4만원대"],
  "1인 7만원 이하": ["7만원 이하", "5만원대", "6만원대"],
  "1인 10만원 이상": ["10만원 이상", "고급", "프리미엄"],
};
const MAX_RESULTS = 50;
const MAX_QUERIES = 16;
const MAX_SEARCHES = 24;
const QUERY_BATCH_SIZE = 4;
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
  foodDetail,
  headcount,
  budget,
}: {
  mode: DiningMode;
  region: string;
  district: string;
  officeArea: string;
  foodType: string;
  foodDetail: string;
  headcount: string;
  budget: string;
}) {
  const location = [region, district === "전체" ? "" : district, officeArea]
    .filter(Boolean)
    .join(" ");
  const categoryFood = FOOD_QUERY[foodType] ?? FOOD_QUERY.전체;
  const detailFood = foodDetail === "전체" ? null : FOOD_DETAIL_QUERY[foodDetail];
  const foodTerms = Array.from(new Set(
    detailFood
      ? [detailFood, categoryFood]
      : (FOOD_DISCOVERY[foodType] ?? FOOD_DISCOVERY.전체),
  ));
  const budgetTerms = BUDGET_QUERY[budget] ?? [budget];
  const primaryFood = foodTerms[0] ?? categoryFood;
  const primaryBudget = budgetTerms[0] ?? budget;
  const purpose = mode === "회식" ? `${headcount} 회식` : "직장인 점심";

  // Naver Local Search returns at most five places per query and cannot be
  // paginated. Search each food term on its own first so detailed categories
  // contribute different restaurants instead of repeating one broad top five.
  const queries = foodTerms.map((food) => `${location} ${food}`);

  for (const food of foodTerms) {
    queries.push(`${location} ${food} ${primaryBudget}`);
  }

  queries.push(
    `${location} ${primaryFood} ${purpose}`,
    `${location} ${primaryFood} ${purpose} ${primaryBudget}`,
  );
  for (const price of budgetTerms.slice(1)) {
    queries.push(`${location} ${primaryFood} ${purpose} ${price}`);
  }

  return Array.from(new Set(
    queries.map((query) => query.replace(/\s+/g, " ").trim()),
  )).slice(0, MAX_QUERIES);
}

async function searchNaver(
  query: string,
  sort: "random" | "comment",
  clientId: string,
  clientSecret: string,
) {
  const url = new URL("https://openapi.naver.com/v1/search/local.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", "5");
  url.searchParams.set("sort", sort);

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
  const foodDetail = (request.nextUrl.searchParams.get("foodDetail") || "전체").trim().slice(0, 30);
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

  const queries = makeQueries({ mode, region, district, officeArea, foodType, foodDetail, headcount, budget });
  const searches = [
    ...queries.map((query) => ({ query, sort: "random" as const })),
    ...queries.map((query) => ({ query, sort: "comment" as const })),
  ].slice(0, MAX_SEARCHES);
  const found = new Map<string, NaverLocalItem>();

  try {
    let successfulQueries = 0;
    let lastError: unknown;
    for (let offset = 0; offset < searches.length && found.size < MAX_RESULTS; offset += QUERY_BATCH_SIZE) {
      const batch = await Promise.allSettled(
        searches
          .slice(offset, offset + QUERY_BATCH_SIZE)
          .map(({ query, sort }) => searchNaver(query, sort, clientId, clientSecret)),
      );
      for (const result of batch) {
        if (result.status === "rejected") {
          lastError = result.reason;
          continue;
        }
        successfulQueries += 1;
        for (const item of result.value) {
          const name = stripHtml(item.title);
          const address = stripHtml(item.roadAddress) || stripHtml(item.address);
          const point = coordinates(item);
          if (!name || !address || !point || !FOOD_CATEGORY.test(stripHtml(item.category))) continue;
          found.set(`${name}|${address}`, item);
          if (found.size >= MAX_RESULTS) break;
        }
      }
    }
    if (successfulQueries === 0 && lastError) throw lastError;

    const places = Array.from(found.values()).slice(0, MAX_RESULTS).map((item, index) => {
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
