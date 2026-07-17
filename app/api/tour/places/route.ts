import { NextRequest, NextResponse } from "next/server";

const TOUR_API_BASE = "https://apis.data.go.kr/B551011/KorService2";
const PAGE_SIZE_MAX = 100;

const regionCodes: Record<string, string> = {
  서울: "1",
  인천: "2",
  대전: "3",
  대구: "4",
  광주: "5",
  부산: "6",
  울산: "7",
  세종: "8",
  경기: "31",
  강원: "32",
  충북: "33",
  충남: "34",
  경북: "35",
  경남: "36",
  전북: "37",
  전남: "38",
  제주: "39",
};

const regionNames = Object.fromEntries(
  Object.entries(regionCodes).map(([name, code]) => [code, name])
) as Record<string, string>;

const contentTypeNames: Record<string, string> = {
  "12": "관광지",
  "14": "관광지",
  "15": "축제",
  "39": "음식",
};

const foodCategoryCodes: Record<string, string> = {
  한식: "A05020100",
  양식: "A05020200",
  일식: "A05020300",
  중식: "A05020400",
  세계음식: "A05020500",
};

const cafeCategoryCode = "A05020900";

const detailKeywords: Record<string, Record<string, string[]>> = {
  음식: {
    해산물: ["해산물", "횟집", "해물", "회"],
    간편식: ["치킨", "피자", "햄버거", "분식"],
    건강식: ["비건", "채식", "샐러드", "포케"],
    주점: ["주점", "이자카야", "포차", "펍"],
  },
  카페: {
    프랜차이즈: ["스타벅스", "투썸플레이스", "이디야", "컴포즈커피"],
    감성카페: ["감성", "한옥카페", "정원카페", "갤러리카페"],
    뷰카페: ["오션뷰", "루프탑", "전망카페", "호수카페"],
    대형카페: ["대형카페", "베이커리카페", "카페팩토리"],
    조용한카페: ["북카페", "서재", "책방카페", "정원카페"],
    "작업하기 좋은 카페": ["스터디카페", "워크라운지", "북카페"],
    이색카페: ["테마카페", "체험카페", "동물카페", "갤러리카페"],
  },
  축제: {
    계절축제: ["봄축제", "여름축제", "가을축제", "겨울축제"],
    먹거리축제: ["먹거리축제", "음식축제", "푸드페스티벌"],
    전통축제: ["전통축제", "민속축제", "문화제"],
    문화예술축제: ["문화축제", "예술축제", "아트페스티벌"],
    "음악 페스티벌": ["음악축제", "뮤직페스티벌", "콘서트"],
    불꽃축제: ["불꽃축제", "불꽃놀이"],
    체험행사: ["체험축제", "체험행사", "박람회"],
  },
  관광지: {
    박물관: ["박물관", "기념관"],
    "미술관·전시관": ["미술관", "전시관"],
    전시회: ["전시회", "특별전"],
    공원: ["공원", "수목원"],
    "역사·유적": ["유적", "고궁", "성곽", "사적"],
    테마파크: ["테마파크", "놀이공원", "아쿠아리움"],
  },
};

interface QuerySource {
  contentTypeId?: string;
  cat1?: string;
  cat3?: string;
  keyword?: string;
}

interface TourApiItem {
  contentid?: string;
  contenttypeid?: string;
  title?: string;
  addr1?: string;
  addr2?: string;
  mapx?: string;
  mapy?: string;
  firstimage?: string;
  firstimage2?: string;
  areacode?: string;
  sigungucode?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
  code?: string;
  name?: string;
}

interface TourApiPayload {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: {
      numOfRows?: number;
      pageNo?: number;
      totalCount?: number;
      items?: {
        item?: TourApiItem | TourApiItem[];
      };
    };
  };
}

function asItems(payload: TourApiPayload) {
  const rawItems = payload.response?.body?.items?.item;
  return Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getQuerySources(category: string, detailType: string): QuerySource[] {
  if (category === "전체") {
    return ["12", "14", "15", "39"].map((contentTypeId) => ({
      contentTypeId,
    }));
  }

  if (category === "음식") {
    const cat3 = foodCategoryCodes[detailType];
    if (cat3) return [{ contentTypeId: "39", cat3 }];

    const keywords = detailKeywords.음식[detailType];
    if (keywords) {
      return keywords.map((keyword) => ({ contentTypeId: "39", keyword }));
    }

    return [{ contentTypeId: "39" }];
  }

  if (category === "카페") {
    const keywords = detailKeywords.카페[detailType];
    if (keywords) {
      return keywords.map((keyword) => ({
        contentTypeId: "39",
        cat3: cafeCategoryCode,
        keyword,
      }));
    }

    return [{ contentTypeId: "39", cat3: cafeCategoryCode }];
  }

  if (category === "축제") {
    const keywords = detailKeywords.축제[detailType];
    if (keywords) {
      return keywords.map((keyword) => ({ contentTypeId: "15", keyword }));
    }

    return [{ contentTypeId: "15" }];
  }

  if (category === "관광지") {
    if (detailType === "자연명소") {
      return [{ contentTypeId: "12", cat1: "A01" }];
    }

    const keywords = detailKeywords.관광지[detailType];
    if (keywords) {
      const contentTypeId = ["박물관", "미술관·전시관", "전시회"].includes(
        detailType
      )
        ? "14"
        : "12";

      return keywords.map((keyword) => ({ contentTypeId, keyword }));
    }

    return [{ contentTypeId: "12" }, { contentTypeId: "14" }];
  }

  return [];
}

function uniqueItems(items: TourApiItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key =
      item.contentid ??
      [item.title, item.mapx, item.mapy].filter(Boolean).join("|");

    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getCity(address: string, region: string) {
  const parts = address.trim().split(/\s+/);
  if (!parts.length) return null;
  return parts[0] === region ? parts[1] ?? null : parts[1] ?? null;
}

async function requestTourApi(path: string, params: URLSearchParams) {
  const response = await fetch(`${TOUR_API_BASE}/${path}?${params.toString()}`, {
    next: { revalidate: 3600 },
  });

  const responseText = await response.text();
  let payload: TourApiPayload;

  try {
    payload = JSON.parse(responseText) as TourApiPayload;
  } catch {
    throw new Error(`TourAPI가 JSON이 아닌 응답을 반환했습니다. (HTTP ${response.status})`);
  }

  const header = payload.response?.header;
  if (!response.ok || header?.resultCode !== "0000") {
    throw new Error(header?.resultMsg ?? `TourAPI 요청 실패 (HTTP ${response.status})`);
  }

  return payload;
}

export async function GET(request: NextRequest) {
  const rawServiceKey = (
    process.env.TOUR_API_SERVICE_KEY ?? process.env.TOUR_API_KEY
  )?.trim();

  if (!rawServiceKey) {
    return NextResponse.json(
      { error: "TOUR_API_SERVICE_KEY 또는 TOUR_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  let serviceKey = rawServiceKey;
  if (rawServiceKey.includes("%")) {
    try {
      serviceKey = decodeURIComponent(rawServiceKey);
    } catch {
      serviceKey = rawServiceKey;
    }
  }

  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("mode") ?? "places";
  const region = searchParams.get("region") ?? "전국";
  const areaCode = regionCodes[region] ?? "";
  const mobileApp = process.env.TOUR_API_MOBILE_APP ?? "KoreaPick";

  const commonParams = new URLSearchParams({
    serviceKey,
    MobileOS: "ETC",
    MobileApp: mobileApp,
    _type: "json",
  });

  try {
    if (mode === "subregions") {
      if (!areaCode) {
        return NextResponse.json({ subregions: [] });
      }

      commonParams.set("areaCode", areaCode);
      commonParams.set("pageNo", "1");
      commonParams.set("numOfRows", "100");

      const payload = await requestTourApi("areaCode2", commonParams);
      const subregions = asItems(payload)
        .map((item) => ({ code: item.code ?? "", name: item.name ?? "" }))
        .filter((item) => item.code && item.name);

      return NextResponse.json({ subregions });
    }

    const page = positiveInteger(searchParams.get("page"), 1);
    const pageSize = Math.min(
      positiveInteger(searchParams.get("pageSize"), 100),
      PAGE_SIZE_MAX
    );
    const category = searchParams.get("category") ?? "전체";
    const detailType = searchParams.get("detailType") ?? "전체";
    const sigunguCode = searchParams.get("sigunguCode") ?? "";
    const sources = getQuerySources(category, detailType);

    if (!sources.length) {
      return NextResponse.json(
        { error: "지원하지 않는 장소 카테고리입니다." },
        { status: 400 }
      );
    }

    const latitudeParam = searchParams.get("lat");
    const longitudeParam = searchParams.get("lng");
    const latitude = Number(latitudeParam);
    const longitude = Number(longitudeParam);
    const useLocation =
      latitudeParam !== null &&
      longitudeParam !== null &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude);

    const keywordSearch = sources.some((source) => source.keyword);
    const multiSourceSearch = sources.length > 1;
    const rowsPerSource = keywordSearch
      ? PAGE_SIZE_MAX
      : multiSourceSearch
        ? Math.max(1, Math.floor(pageSize / sources.length))
        : pageSize;

    const payloads = await Promise.all(
      sources.map((source) => {
        const params = new URLSearchParams(commonParams);
        params.set("pageNo", keywordSearch ? "1" : String(page));
        params.set("numOfRows", String(rowsPerSource));
        params.set("arrange", "Q");

        if (areaCode) params.set("areaCode", areaCode);
        if (areaCode && sigunguCode) params.set("sigunguCode", sigunguCode);
        if (source.contentTypeId) params.set("contentTypeId", source.contentTypeId);
        if (source.cat1) params.set("cat1", source.cat1);
        if (source.cat3) params.set("cat3", source.cat3);

        if (source.keyword) {
          params.set("keyword", source.keyword);
          return requestTourApi("searchKeyword2", params);
        }

        if (useLocation) {
          params.set("mapX", String(longitude));
          params.set("mapY", String(latitude));
          params.set(
            "radius",
            String(
              Math.min(
                20000,
                positiveInteger(searchParams.get("radius"), 10000)
              )
            )
          );
          params.set("arrange", "E");
          return requestTourApi("locationBasedList2", params);
        }

        return requestTourApi("areaBasedList2", params);
      })
    );

    const rawItems = uniqueItems(payloads.flatMap((payload) => asItems(payload)));
    const categoryItems =
      category === "음식" && detailType === "전체"
        ? rawItems.filter((item) => item.cat3 !== cafeCategoryCode)
        : rawItems;

    const places = categoryItems
      .map((item) => {
        const address = [item.addr1, item.addr2].filter(Boolean).join(" ");
        const normalizedRegion =
          regionNames[item.areacode ?? ""] ?? address.split(/\s+/)[0] ?? region;
        const contentTypeId = item.contenttypeid ?? "";
        const normalizedCategory =
          category === "전체"
            ? item.cat3 === cafeCategoryCode
              ? "카페"
              : contentTypeNames[contentTypeId] ?? "기타"
            : detailType === "전체"
              ? category
              : `${category} · ${detailType}`;

        return {
          id: item.contentid ?? "",
          name: item.title ?? "",
          region: normalizedRegion,
          city: getCity(address, normalizedRegion),
          category: normalizedCategory,
          address: address || null,
          latitude: Number(item.mapy),
          longitude: Number(item.mapx),
          imageUrl: item.firstimage ?? item.firstimage2 ?? null,
        };
      })
      .filter(
        (place) =>
          place.id &&
          place.name &&
          Number.isFinite(place.latitude) &&
          Number.isFinite(place.longitude) &&
          place.latitude >= 32 &&
          place.latitude <= 39.8 &&
          place.longitude >= 124 &&
          place.longitude <= 132
      );

    const bodies = payloads.map((payload) => payload.response?.body);
    const totalCount = keywordSearch
      ? places.length
      : bodies.reduce((sum, body) => sum + Number(body?.totalCount ?? 0), 0);
    const totalPages = keywordSearch
      ? 1
      : Math.max(
          1,
          ...bodies.map((body) =>
            Math.ceil(
              Number(body?.totalCount ?? 0) /
                Math.max(1, Number(body?.numOfRows ?? rowsPerSource))
            )
          )
        );

    return NextResponse.json({
      places,
      pagination: {
        pageNo: keywordSearch ? 1 : page,
        numOfRows: pageSize,
        totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("TourAPI 요청 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TourAPI 요청에 실패했습니다." },
      { status: 502 }
    );
  }
}
