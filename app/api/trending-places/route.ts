import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TRENDING_LIMIT = 4;
const EVENT_TYPES = ["view", "detail", "outbound", "favorite"] as const;

type EventType = (typeof EVENT_TYPES)[number];

interface TrendingPlaceRow {
  place_id: string;
  name: string;
  region: string;
  city: string | null;
  category: string;
  address: string | null;
  image_url: string | null;
  score: number | string;
  view_count: number | string;
  detail_count: number | string;
  outbound_count: number | string;
  favorite_count: number | string;
  updated_at: string;
}

interface TourApiItem {
  contentid?: string;
  title?: string;
  addr1?: string;
  addr2?: string;
  firstimage?: string;
  firstimage2?: string;
}

interface TourApiPayload {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      items?: { item?: TourApiItem | TourApiItem[] };
    };
  };
}

interface TrendingPlace {
  id: string;
  rank: number;
  category: string;
  location: string;
  title: string;
  description: string;
  imageUrl: string | null;
  icon: string;
  popularityScore: number;
  viewCount: number;
  detailCount: number;
  outboundCount: number;
  favoriteCount: number;
  source: "activity" | "tour" | "fallback";
  updatedAt: string;
}

const sourceDefinitions = [
  { category: "카페", contentTypeId: "39", cat3: "A05020900", icon: "☕" },
  { category: "축제", contentTypeId: "15", icon: "🎆" },
  { category: "관광지", contentTypeId: "12", icon: "🚋" },
  { category: "음식", contentTypeId: "39", icon: "🍜" },
] as const;

const emergencyPlaces: TrendingPlace[] = [
  {
    id: "fallback-cafe",
    rank: 0,
    category: "카페",
    location: "부산 해운대",
    title: "해운대 오션뷰 루프탑 카페",
    description: "실시간 장소 데이터를 준비하고 있습니다.",
    imageUrl: null,
    icon: "☕",
    popularityScore: 0,
    viewCount: 0,
    detailCount: 0,
    outboundCount: 0,
    favoriteCount: 0,
    source: "fallback",
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "fallback-festival",
    rank: 0,
    category: "축제",
    location: "경기 수원",
    title: "수원화성 야간 문화축제",
    description: "실시간 장소 데이터를 준비하고 있습니다.",
    imageUrl: null,
    icon: "🎆",
    popularityScore: 0,
    viewCount: 0,
    detailCount: 0,
    outboundCount: 0,
    favoriteCount: 0,
    source: "fallback",
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "fallback-tour",
    rank: 0,
    category: "관광지",
    location: "제주 서귀포",
    title: "애월 해안도로 드라이브",
    description: "실시간 장소 데이터를 준비하고 있습니다.",
    imageUrl: null,
    icon: "🚋",
    popularityScore: 0,
    viewCount: 0,
    detailCount: 0,
    outboundCount: 0,
    favoriteCount: 0,
    source: "fallback",
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "fallback-food",
    rank: 0,
    category: "음식",
    location: "서울 성동구",
    title: "성수동 분위기 좋은 맛집",
    description: "실시간 장소 데이터를 준비하고 있습니다.",
    imageUrl: null,
    icon: "🍜",
    popularityScore: 0,
    viewCount: 0,
    detailCount: 0,
    outboundCount: 0,
    favoriteCount: 0,
    source: "fallback",
    updatedAt: new Date(0).toISOString(),
  },
];

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function numberValue(value: number | string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function categoryIcon(category: string) {
  if (category.includes("카페")) return "☕";
  if (category.includes("축제")) return "🎆";
  if (category.includes("음식") || category.includes("맛집")) return "🍜";
  return "🚋";
}

function createSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return null;

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadActivityPlaces(): Promise<TrendingPlace[]> {
  const supabase = createSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("live_trending_places")
    .select(
      "place_id,name,region,city,category,address,image_url,score,view_count,detail_count,outbound_count,favorite_count,updated_at"
    )
    .order("score", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(TRENDING_LIMIT);

  if (error) {
    console.warn("실시간 인기 테이블 조회 실패:", error.message);
    return [];
  }

  return ((data ?? []) as TrendingPlaceRow[]).map((row) => ({
    id: row.place_id,
    rank: 0,
    category: row.category,
    location: [row.region, row.city].filter(Boolean).join(" "),
    title: row.name,
    description: row.address ?? "장소 정보와 위치를 확인해 보세요.",
    imageUrl: row.image_url,
    icon: categoryIcon(row.category),
    popularityScore: numberValue(row.score),
    viewCount: numberValue(row.view_count),
    detailCount: numberValue(row.detail_count),
    outboundCount: numberValue(row.outbound_count),
    favoriteCount: numberValue(row.favorite_count),
    source: "activity",
    updatedAt: row.updated_at,
  }));
}

function getTourItems(payload: TourApiPayload) {
  const rawItems = payload.response?.body?.items?.item;
  return Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
}

function decodeServiceKey(rawKey: string) {
  if (!rawKey.includes("%")) return rawKey;
  try {
    return decodeURIComponent(rawKey);
  } catch {
    return rawKey;
  }
}

async function loadTourPlaces(): Promise<TrendingPlace[]> {
  const rawKey = (
    process.env.TOUR_API_SERVICE_KEY ?? process.env.TOUR_API_KEY
  )?.trim();
  if (!rawKey) return [];

  const serviceKey = decodeServiceKey(rawKey);
  const results = await Promise.allSettled(
    sourceDefinitions.map(async (source) => {
      const params = new URLSearchParams({
        serviceKey,
        MobileOS: "ETC",
        MobileApp: process.env.TOUR_API_MOBILE_APP ?? "KoreaPick",
        _type: "json",
        pageNo: "1",
        numOfRows: "20",
        arrange: "Q",
        contentTypeId: source.contentTypeId,
      });
      if ("cat3" in source) params.set("cat3", source.cat3);

      const response = await fetch(
        `https://apis.data.go.kr/B551011/KorService2/areaBasedList2?${params.toString()}`,
        { next: { revalidate: 1800 } }
      );
      const payload = (await response.json()) as TourApiPayload;
      if (!response.ok || payload.response?.header?.resultCode !== "0000") {
        throw new Error(
          payload.response?.header?.resultMsg ?? `TourAPI HTTP ${response.status}`
        );
      }

      const items = getTourItems(payload);
      const item =
        items.find((candidate) => candidate.firstimage || candidate.firstimage2) ??
        items[0];
      if (!item?.contentid || !item.title) return null;

      const address = [item.addr1, item.addr2].filter(Boolean).join(" ");
      const location = address.split(/\s+/).slice(0, 2).join(" ") || "전국";
      const imageUrl = (item.firstimage ?? item.firstimage2 ?? "").replace(
        /^http:/,
        "https:"
      );

      return {
        id: item.contentid,
        rank: 0,
        category: source.category,
        location,
        title: item.title,
        description: address || "한국관광공사 추천 장소입니다.",
        imageUrl: imageUrl || null,
        icon: source.icon,
        popularityScore: 0,
        viewCount: 0,
        detailCount: 0,
        outboundCount: 0,
        favoriteCount: 0,
        source: "tour" as const,
        updatedAt: new Date().toISOString(),
      };
    })
  );

  return results.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : []
  );
}

export async function GET() {
  const activityPlaces = await loadActivityPlaces();
  const tourPlaces =
    activityPlaces.length >= TRENDING_LIMIT ? [] : await loadTourPlaces();

  const seen = new Set<string>();
  const merged = [...activityPlaces, ...tourPlaces, ...emergencyPlaces]
    .filter((place) => {
      if (seen.has(place.id)) return false;
      seen.add(place.id);
      return true;
    })
    .slice(0, TRENDING_LIMIT)
    .map((place, index) => ({ ...place, rank: index + 1 }));

  return NextResponse.json(
    {
      updatedAt: new Date().toISOString(),
      realtimeEnabled: activityPlaces.length > 0,
      places: merged,
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const eventType = cleanText(body.eventType, 20) as EventType;
  const placeId = cleanText(body.id, 120);
  const name = cleanText(body.name, 160);
  const region = cleanText(body.region, 80) || "전국";
  const category = cleanText(body.category, 80) || "기타";
  const visitorId = cleanText(body.visitorId, 100);

  if (!EVENT_TYPES.includes(eventType) || !placeId || !name || !visitorId) {
    return NextResponse.json({ error: "필수 장소 정보가 없습니다." }, { status: 400 });
  }

  const supabase = createSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase 연결 정보가 없습니다." }, { status: 503 });
  }

  const { error } = await supabase.from("place_activity").insert({
    place_id: placeId,
    name,
    region,
    city: cleanText(body.city, 80) || null,
    category,
    address: cleanText(body.address, 300) || null,
    image_url: cleanText(body.imageUrl, 1000) || null,
    event_type: eventType,
    visitor_id: visitorId,
    event_bucket: Math.floor(Date.now() / (15 * 60 * 1000)),
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, deduplicated: true });
    }
    console.error("장소 활동 저장 실패:", error.message);
    return NextResponse.json(
      { error: "실시간 인기 데이터 저장에 실패했습니다." },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
