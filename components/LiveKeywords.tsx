"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { trackKeywordSearch } from "@/utils/trackKeywordSearch";

type KeywordTrend = "up" | "down" | "same" | "new";

type Keyword = {
  id: number | string;
  keyword: string;
  rank: number;
  trend: KeywordTrend;
  change: number;
  searchCount: number;
};

type KeywordResponse = {
  updatedAt: string;
  realtimeEnabled: boolean;
  keywords: Keyword[];
};

function categoryFromKeyword(keyword: string) {
  if (keyword.includes("카페")) return "카페";
  if (keyword.includes("음식") || keyword.includes("맛집")) return "음식";
  if (keyword.includes("축제")) return "축제";
  if (keyword.includes("관광") || keyword.includes("여행")) return "관광지";
  return "전체";
}

export default function LiveKeywords() {
  const router = useRouter();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  const fetchKeywords = useCallback(async () => {
    try {
      const response = await fetch(`/api/trending-keywords?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("인기 검색어를 불러오지 못했습니다.");

      const data = (await response.json()) as KeywordResponse;
      setKeywords(data.keywords);
      setUpdatedAt(new Date(data.updatedAt));
      setRealtimeEnabled(data.realtimeEnabled);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    const firstLoad = window.setTimeout(() => void fetchKeywords(), 0);
    const intervalId = window.setInterval(() => void fetchKeywords(), 15000);
    let supabase: ReturnType<typeof createClient> | null = null;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;

    try {
      supabase = createClient();
      channel = supabase
        .channel("public:live-keyword-events")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "keyword_search_events" },
          () => void fetchKeywords()
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "place_activity" },
          () => void fetchKeywords()
        )
        .subscribe();
    } catch {
      // Realtime 설정 전에는 15초 폴링으로 순위를 갱신합니다.
    }

    return () => {
      window.clearTimeout(firstLoad);
      window.clearInterval(intervalId);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [fetchKeywords]);

  const openKeyword = (keyword: string) => {
    void trackKeywordSearch(keyword, "trend").then(fetchKeywords);
    const params = new URLSearchParams({
      category: categoryFromKeyword(keyword),
      keyword,
    });
    router.push(`/explore?${params.toString()}`);
  };

  const trendLabel = (item: Keyword) => {
    if (item.trend === "up") {
      return { text: `▲ ${item.change}`, label: `${item.change}단계 상승`, className: "is-up" };
    }
    if (item.trend === "down") {
      return { text: `▼ ${item.change}`, label: `${item.change}단계 하락`, className: "is-down" };
    }
    if (item.trend === "new") {
      return { text: "NEW", label: "새로 진입", className: "is-new" };
    }
    return { text: "—", label: "순위 유지", className: "is-same" };
  };

  return (
    <section className="kp-keyword-panel" aria-labelledby="live-keyword-title">
      <div className="kp-keyword-heading">
        <div>
          <span className="kp-keyword-live"><i aria-hidden="true" /> LIVE</span>
          <h2 id="live-keyword-title">실시간 인기 검색어</h2>
          <p>검색과 장소 반응을 30분 단위로 비교합니다.</p>
        </div>
        <div className="kp-keyword-time" aria-live="polite">
          <strong>{realtimeEnabled ? "실시간 데이터 연결" : "데이터 연결 준비"}</strong>
          {updatedAt && (
            <time dateTime={updatedAt.toISOString()}>
              {updatedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 갱신
            </time>
          )}
        </div>
      </div>

      <div className="kp-keyword-grid">
        {keywords.length === 0 && (
          <span className="kp-keyword-loading">인기 검색어를 불러오는 중입니다.</span>
        )}

        {keywords.map((item) => {
          const trend = trendLabel(item);
          return (
            <button
              className="kp-keyword-item"
              key={item.id}
              type="button"
              onClick={() => openKeyword(item.keyword)}
              aria-label={`${item.rank}위 ${item.keyword}, ${trend.label}`}
            >
              <span className="kp-keyword-rank">{String(item.rank).padStart(2, "0")}</span>
              <span className="kp-keyword-name">
                <strong>{item.keyword}</strong>
                <small>반응 {item.searchCount.toLocaleString("ko-KR")}</small>
              </span>
              <span className={`kp-keyword-trend ${trend.className}`}>{trend.text}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
