import { createHash } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const KEYWORD_LIMIT = 6;

type KeywordTrend = "up" | "down" | "same" | "new";

interface TrendingKeywordRow {
  keyword: string;
  search_count: number | string;
  current_score: number | string;
  previous_score: number | string;
  current_rank: number | string;
  previous_rank: number | string | null;
}

const fallbackKeywords = [
  "서울 데이트",
  "부산 관광지",
  "제주 카페",
  "수원 음식",
  "비 오는 날",
  "주말 나들이",
];

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

function cleanKeyword(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 60);
}

function numberValue(value: number | string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fallbackResponse() {
  return fallbackKeywords.map((keyword, index) => ({
    id: `fallback-${index + 1}`,
    keyword,
    rank: index + 1,
    previousRank: index + 1,
    trend: "same" as const,
    change: 0,
    searchCount: 0,
  }));
}

export async function GET() {
  const supabase = createSupabase();

  if (!supabase) {
    return NextResponse.json(
      {
        updatedAt: new Date().toISOString(),
        realtimeEnabled: false,
        keywords: fallbackResponse(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const { data, error } = await supabase.rpc("get_live_trending_keywords", {
    window_minutes: 30,
    result_limit: KEYWORD_LIMIT,
  });

  if (error) {
    console.warn("실시간 인기 검색어 조회 실패:", error.message);
    return NextResponse.json(
      {
        updatedAt: new Date().toISOString(),
        realtimeEnabled: false,
        keywords: fallbackResponse(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const keywords = ((data ?? []) as TrendingKeywordRow[]).map((row, index) => {
    const rank = numberValue(row.current_rank) || index + 1;
    const previousRank = row.previous_rank
      ? numberValue(row.previous_rank)
      : null;
    let trend: KeywordTrend = "same";
    let change = 0;

    if (previousRank === null) {
      trend = "new";
    } else if (previousRank > rank) {
      trend = "up";
      change = previousRank - rank;
    } else if (previousRank < rank) {
      trend = "down";
      change = rank - previousRank;
    }

    return {
      id: row.keyword,
      keyword: row.keyword,
      rank,
      previousRank,
      trend,
      change,
      searchCount: numberValue(row.search_count),
      currentScore: numberValue(row.current_score),
      previousScore: numberValue(row.previous_score),
    };
  });

  return NextResponse.json(
    {
      updatedAt: new Date().toISOString(),
      realtimeEnabled: true,
      keywords: keywords.length > 0 ? keywords : fallbackResponse(),
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

  const keyword = cleanKeyword(body.keyword);
  const visitorId = cleanKeyword(body.visitorId);
  const source = body.source === "trend" ? "trend" : "search";

  if (keyword.length < 2 || !visitorId) {
    return NextResponse.json({ error: "검색어 정보가 부족합니다." }, { status: 400 });
  }

  const supabase = createSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase 연결 정보가 없습니다." }, { status: 503 });
  }

  const visitorKey = createHash("sha256")
    .update(`${visitorId}:${process.env.KEYWORD_HASH_SALT ?? "korea-pick"}`)
    .digest("hex");

  const { error } = await supabase.from("keyword_search_events").insert({
    keyword,
    visitor_key: visitorKey,
    source,
    event_bucket: Math.floor(Date.now() / (5 * 60 * 1000)),
  });

  if (error && error.code !== "23505") {
    console.error("인기 검색어 활동 저장 실패:", error.message);
    return NextResponse.json({ error: "검색 활동 저장에 실패했습니다." }, { status: 503 });
  }

  return NextResponse.json({ ok: true, deduplicated: error?.code === "23505" });
}
