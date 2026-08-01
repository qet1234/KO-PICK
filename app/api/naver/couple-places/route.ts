import { NextRequest, NextResponse } from "next/server";

type CategoryValue = "음식" | "카페" | "축제" | "관광지";

type NaverLocalItem = {
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

type SearchPreset = {
  category: CategoryValue;
  detailCategory: string;
  keyword: string;
  weight: number;
};

type RankedPlace = {
  place: Record<string, unknown>;
  score: number;
  matches: number;
};

type NaverCredentials = {
  endpoint: string;
  headers: Record<string, string>;
  hub: boolean;
};

const TYPE_PRESETS: Record<string, SearchPreset[]> = {
  카페: [
    { category: "카페", detailCategory: "감성 카페", keyword: "데이트 감성 카페", weight: 132 },
    { category: "카페", detailCategory: "뷰 카페", keyword: "뷰 좋은 데이트 카페", weight: 128 },
    { category: "카페", detailCategory: "베이커리 카페", keyword: "데이트 베이커리 카페", weight: 124 },
    { category: "카페", detailCategory: "디저트 카페", keyword: "데이트 디저트 카페", weight: 120 },
    { category: "카페", detailCategory: "루프탑 카페", keyword: "루프탑 데이트 카페", weight: 116 },
    { category: "카페", detailCategory: "한옥 카페", keyword: "한옥 데이트 카페", weight: 112 },
    { category: "카페", detailCategory: "이색 카페", keyword: "이색 데이트 카페", weight: 108 },
  ],
  "데이트 관광지": [
    { category: "관광지", detailCategory: "데이트 명소", keyword: "데이트 명소", weight: 132 },
    { category: "관광지", detailCategory: "산책", keyword: "커플 산책 데이트", weight: 128 },
    { category: "관광지", detailCategory: "야경", keyword: "데이트 야경 명소", weight: 126 },
    { category: "관광지", detailCategory: "전시", keyword: "전시 데이트", weight: 122 },
    { category: "관광지", detailCategory: "실내 데이트", keyword: "실내 데이트", weight: 118 },
    { category: "관광지", detailCategory: "체험", keyword: "이색 체험 데이트", weight: 114 },
    { category: "관광지", detailCategory: "공원", keyword: "데이트 공원", weight: 110 },
  ],
  음식: [
    { category: "음식", detailCategory: "데이트 맛집", keyword: "데이트 맛집", weight: 132 },
    { category: "음식", detailCategory: "파스타", keyword: "데이트 파스타 맛집", weight: 128 },
    { category: "음식", detailCategory: "브런치", keyword: "데이트 브런치 맛집", weight: 124 },
    { category: "음식", detailCategory: "분위기 좋은 식당", keyword: "분위기 좋은 데이트 식당", weight: 122 },
    { category: "음식", detailCategory: "한식", keyword: "데이트 한식 맛집", weight: 116 },
    { category: "음식", detailCategory: "일식", keyword: "데이트 일식 맛집", weight: 114 },
    { category: "음식", detailCategory: "와인바", keyword: "데이트 와인바", weight: 110 },
  ],
  축제: [
    { category: "축제", detailCategory: "계절 축제", keyword: "데이트 계절 축제", weight: 130 },
    { category: "축제", detailCategory: "야간 축제", keyword: "야간 축제 데이트", weight: 126 },
    { category: "축제", detailCategory: "문화예술 축제", keyword: "문화예술 축제", weight: 122 },
    { category: "축제", detailCategory: "음악 축제", keyword: "음악 페스티벌", weight: 118 },
    { category: "축제", detailCategory: "불꽃 축제", keyword: "불꽃 축제", weight: 116 },
    { category: "축제", detailCategory: "야시장", keyword: "데이트 야시장", weight: 112 },
  ],
};

const ALL_PRESETS: SearchPreset[] = [
  TYPE_PRESETS.카페[0],
  TYPE_PRESETS["데이트 관광지"][0],
  TYPE_PRESETS.음식[0],
  TYPE_PRESETS.축제[0],
  TYPE_PRESETS.카페[1],
  TYPE_PRESETS["데이트 관광지"][2],
  TYPE_PRESETS.음식[1],
  TYPE_PRESETS.축제[1],
  TYPE_PRESETS.카페[2],
  TYPE_PRESETS["데이트 관광지"][3],
  TYPE_PRESETS.음식[2],
  TYPE_PRESETS.축제[2],
];

const NATIONAL_REGIONS = [
  "서울",
  "경기",
  "부산",
  "제주",
  "인천",
  "대구",
  "대전",
  "광주",
  "강원",
  "경남",
  "전북",
  "충남",
];

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
  return current.count > 40;
}

function stripHtml(value = "") {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function normalize(value = "") {
  return stripHtml(value).replace(/[^0-9A-Za-z가-힣]/g, "").toLowerCase();
}

function coordinate(value: string | number | undefined, axis: "x" | "y") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const converted = Math.abs(numeric) > 1000 ? numeric / 10_000_000 : numeric;
  const valid = axis === "x"
    ? converted >= -180 && converted <= 180
    : converted >= -90 && converted <= 90;
  return valid ? converted : null;
}

function regionFromAddress(address: string, fallback: string) {
  const token = address.split(/\s+/)[0] || fallback;
  const mappings: Array<[RegExp, string]> = [
    [/서울/, "서울"], [/부산/, "부산"], [/대구/, "대구"], [/인천/, "인천"],
    [/광주/, "광주"], [/대전/, "대전"], [/울산/, "울산"], [/세종/, "세종"],
    [/경기/, "경기"], [/강원/, "강원"], [/충북|충청북도/, "충북"],
    [/충남|충청남도/, "충남"], [/전북|전북특별자치도|전라북도/, "전북"],
    [/전남|전라남도/, "전남"], [/경북|경상북도/, "경북"],
    [/경남|경상남도/, "경남"], [/제주/, "제주"],
  ];
  return mappings.find(([pattern]) => pattern.test(token))?.[1] || fallback;
}

function cityFromAddress(address: string) {
  const tokens = address.split(/\s+/).filter(Boolean);
  return tokens[1] || null;
}

function matchesCategory(item: NaverLocalItem, category: CategoryValue) {
  const source = stripHtml(item.category);
  if (!source) return true;
  if (category === "카페") return /카페|커피|디저트|베이커리|찻집|제과/.test(source);
  if (category === "음식") return /음식점|한식|중식|일식|양식|분식|뷔페|레스토랑|술집|바|요리/.test(source);
  if (category === "관광지") return /관광|명소|공원|미술관|박물관|전시|문화|공연|테마|수목원|동물원|아쿠아리움|전망대|자연/.test(source);
  return /축제|공연|문화|행사|테마파크|공원|시장/.test(source);
}

function credentials(): NaverCredentials | null {
  const hubId = process.env.NAVER_API_HUB_CLIENT_ID?.trim();
  const hubSecret = process.env.NAVER_API_HUB_CLIENT_SECRET?.trim();
  if (hubId && hubSecret) {
    return {
      endpoint: "https://naverapihub.apigw.ntruss.com/search/v1/local",
      headers: {
        "X-NCP-APIGW-API-KEY-ID": hubId,
        "X-NCP-APIGW-API-KEY": hubSecret,
      },
      hub: true,
    };
  }

  const legacyId =
    process.env.NAVER_SEARCH_CLIENT_ID?.trim() || process.env.NAVER_CLIENT_ID?.trim();
  const legacySecret =
    process.env.NAVER_SEARCH_CLIENT_SECRET?.trim() || process.env.NAVER_CLIENT_SECRET?.trim();
  if (legacyId && legacySecret) {
    return {
      endpoint: "https://openapi.naver.com/v1/search/local.json",
      headers: {
        "X-Naver-Client-Id": legacyId,
        "X-Naver-Client-Secret": legacySecret,
      },
      hub: false,
    };
  }

  return null;
}

async function searchNaver(query: string) {
  const config = credentials();
  if (!config) throw new Error("NAVER_SEARCH_NOT_CONFIGURED");

  const url = new URL(config.endpoint);
  url.searchParams.set("query", query);
  url.searchParams.set("display", "5");
  url.searchParams.set("start", "1");
  url.searchParams.set("sort", "comment");
  if (config.hub) url.searchParams.set("format", "json");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(url, {
      headers: config.headers,
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`NAVER_LOCAL_${response.status}`);
    const payload = await response.json() as {
      items?: NaverLocalItem[];
      channel?: { items?: NaverLocalItem[] };
    };
    return Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.channel?.items)
        ? payload.channel.items
        : [];
  } finally {
    clearTimeout(timeout);
  }
}

function selectedPresets(type: string, page: number) {
  const source = type === "전체" ? ALL_PRESETS : TYPE_PRESETS[type] ?? [];
  if (source.length === 0) return [];
  const count = type === "전체" ? Math.min(8, source.length) : Math.min(6, source.length);
  const start = ((page - 1) * count) % source.length;
  return Array.from({ length: count }, (_, index) => source[(start + index) % source.length]);
}

function buildPlace(
  item: NaverLocalItem,
  preset: SearchPreset,
  requestedRegion: string,
  searchRegion: string,
) {
  const name = stripHtml(item.title);
  const address = stripHtml(item.roadAddress) || stripHtml(item.address);
  const longitude = coordinate(item.mapx, "x");
  const latitude = coordinate(item.mapy, "y");
  if (!name || !address || longitude === null || latitude === null) return null;

  const region = regionFromAddress(
    address,
    requestedRegion === "전국" ? searchRegion : requestedRegion,
  );
  const id = `naver-couple-${normalize(name)}-${normalize(address)}`;

  return {
    id,
    name,
    region,
    city: cityFromAddress(address),
    category: preset.category,
    detailCategory: preset.detailCategory,
    address,
    latitude,
    longitude,
    imageUrl: null,
    imageCopyrightCode: null,
    imageLicenseLabel: null,
    imageAttribution: null,
    imageModificationAllowed: false,
    imageLicenseUrl: null,
    imageSourceUrl: null,
    source: "NAVER_LOCAL_COUPLE_POPULAR",
    sourceCategory: stripHtml(item.category),
    naverLink: stripHtml(item.link),
  };
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (isRateLimited(request)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  if (!credentials()) {
    return NextResponse.json(
      {
        error: "네이버 지역 검색 API 키가 설정되지 않았습니다.",
        required: [
          "NAVER_API_HUB_CLIENT_ID / NAVER_API_HUB_CLIENT_SECRET",
          "NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET",
          "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET",
        ],
      },
      { status: 503 },
    );
  }

  const region = (request.nextUrl.searchParams.get("region") || "전국").trim();
  const district = (request.nextUrl.searchParams.get("clientDistrict") || "전체").trim();
  const type = (request.nextUrl.searchParams.get("journeyType") || "전체").trim();
  const page = Math.min(Math.max(Number(request.nextUrl.searchParams.get("page")) || 1, 1), 3);
  const pageSize = Math.min(Math.max(Number(request.nextUrl.searchParams.get("pageSize")) || 12, 1), 24);
  const presets = selectedPresets(type, page);

  if (presets.length === 0) {
    return NextResponse.json({ places: [], pagination: { pageNo: page, totalCount: 0, totalPages: 1 } });
  }

  const searches = presets.map((preset, index) => {
    const searchRegion = region === "전국"
      ? NATIONAL_REGIONS[(index + (page - 1) * presets.length) % NATIONAL_REGIONS.length]
      : region;
    const location = [searchRegion, district !== "전체" ? district : ""]
      .filter(Boolean)
      .join(" ");
    return {
      preset,
      searchRegion,
      query: `${location} ${preset.keyword}`.trim(),
    };
  });

  const settled = await Promise.allSettled(
    searches.map(async (search) => ({
      ...search,
      items: await searchNaver(search.query),
    })),
  );

  const ranked = new Map<string, RankedPlace>();
  let successfulQueries = 0;

  settled.forEach((result) => {
    if (result.status !== "fulfilled") return;
    successfulQueries += 1;
    const { preset, searchRegion, items } = result.value;

    items.forEach((item, index) => {
      if (!matchesCategory(item, preset.category)) return;
      const place = buildPlace(item, preset, region, searchRegion);
      if (!place) return;
      const key = `${normalize(String(place.name))}|${normalize(String(place.address))}`;
      const positionScore = (5 - index) * 10;
      const existing = ranked.get(key);
      if (existing) {
        existing.score += Math.round((preset.weight + positionScore) * 0.4) + 24;
        existing.matches += 1;
      } else {
        ranked.set(key, {
          place,
          score: preset.weight + positionScore,
          matches: 1,
        });
      }
    });
  });

  const places = Array.from(ranked.values())
    .sort((left, right) => {
      if (right.matches !== left.matches) return right.matches - left.matches;
      return right.score - left.score;
    })
    .slice(0, pageSize)
    .map(({ place, score, matches }) => ({
      ...place,
      couplePopularityScore: score,
      matchedSearchThemes: matches,
    }));

  const response = NextResponse.json({
    places,
    pagination: {
      pageNo: page,
      numOfRows: pageSize,
      totalCount: places.length,
      totalPages: successfulQueries > 0 ? 3 : 1,
    },
    source: "NAVER_LOCAL_COUPLE_POPULAR",
    rankingBasis: "NAVER_COMMENT_SORT",
    sourceNotice: "네이버 지역 검색의 카페·블로그 리뷰 개수 순 정렬을 활용하며 리뷰 본문·별점·사진은 저장하지 않습니다.",
    journey: "커플",
    journeyType: type,
    successfulQueries,
  });
  response.headers.set("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");
  return response;
}
