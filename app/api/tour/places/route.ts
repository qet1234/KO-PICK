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
  "14": "문화",
  "15": "축제",
  "25": "여행코스",
  "28": "레포츠",
  "32": "숙박",
  "38": "쇼핑",
  "39": "맛집",
};

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
    const sigunguCode = searchParams.get("sigunguCode") ?? "";

    commonParams.set("pageNo", String(page));
    commonParams.set("numOfRows", String(pageSize));
    commonParams.set("arrange", "Q");

    if (areaCode) commonParams.set("areaCode", areaCode);
    if (areaCode && sigunguCode) commonParams.set("sigunguCode", sigunguCode);

    if (category === "관광지") commonParams.set("contentTypeId", "12");
    if (category === "문화") commonParams.set("contentTypeId", "14");
    if (category === "자연") commonParams.set("cat1", "A01");
    if (category === "맛집") commonParams.set("contentTypeId", "39");

    const latitudeParam = searchParams.get("lat");
    const longitudeParam = searchParams.get("lng");
    const latitude = Number(latitudeParam);
    const longitude = Number(longitudeParam);
    const useLocation =
      latitudeParam !== null &&
      longitudeParam !== null &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude);

    let operation = "areaBasedList2";
    if (useLocation) {
      operation = "locationBasedList2";
      commonParams.set("mapX", String(longitude));
      commonParams.set("mapY", String(latitude));
      commonParams.set(
        "radius",
        String(Math.min(20000, positiveInteger(searchParams.get("radius"), 10000)))
      );
      commonParams.set("arrange", "E");
    }

    const payload = await requestTourApi(operation, commonParams);
    const body = payload.response?.body;

    const places = asItems(payload)
      .map((item) => {
        const address = [item.addr1, item.addr2].filter(Boolean).join(" ");
        const normalizedRegion =
          regionNames[item.areacode ?? ""] ?? address.split(/\s+/)[0] ?? region;
        const contentTypeId = item.contenttypeid ?? "";
        const normalizedCategory = item.cat1 === "A01"
          ? "자연"
          : contentTypeNames[contentTypeId] ?? "기타";

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

    const totalCount = Number(body?.totalCount ?? places.length);
    const actualPageSize = Number(body?.numOfRows ?? pageSize);

    return NextResponse.json({
      places,
      pagination: {
        pageNo: Number(body?.pageNo ?? page),
        numOfRows: actualPageSize,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / actualPageSize)),
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