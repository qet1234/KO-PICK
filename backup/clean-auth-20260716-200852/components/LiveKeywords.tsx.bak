"use client";

import { useEffect, useState } from "react";

type KeywordTrend = "up" | "down" | "same" | "new";

type Keyword = {
  id: number;
  keyword: string;
  rank: number;
  trend: KeywordTrend;
  change: number;
  searchCount: number;
};

type KeywordResponse = {
  updatedAt: string;
  keywords: Keyword[];
};

export default function LiveKeywords() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchKeywords() {
      try {
        const response = await fetch(
          `/api/trending-keywords?t=${Date.now()}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("인기 검색어를 불러오지 못했습니다.");
        }

        const data = (await response.json()) as KeywordResponse;

        if (active) {
          setKeywords(data.keywords);
          setUpdatedAt(new Date(data.updatedAt));
        }
      } catch (error) {
        console.error(error);
      }
    }

    const firstLoad = window.setTimeout(() => {
      void fetchKeywords();
    }, 0);

    const intervalId = window.setInterval(() => {
      void fetchKeywords();
    }, 30000);

    return () => {
      active = false;
      window.clearTimeout(firstLoad);
      window.clearInterval(intervalId);
    };
  }, []);

  function getTrendLabel(item: Keyword) {
    if (item.trend === "up") {
      return {
        text: `▲ ${item.change}`,
        className: "keyword-trend-up",
      };
    }

    if (item.trend === "down") {
      return {
        text: `▼ ${item.change}`,
        className: "keyword-trend-down",
      };
    }

    if (item.trend === "new") {
      return {
        text: "NEW",
        className: "keyword-trend-new",
      };
    }

    return {
      text: "─",
      className: "keyword-trend-same",
    };
  }

  return (
    <div className="live-keywords-wrap">
      <div className="live-keywords-heading">
        <span className="live-indicator">
          <i aria-hidden />
          실시간 인기 검색어
        </span>

        {updatedAt && (
          <time dateTime={updatedAt.toISOString()}>
            {updatedAt.toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {" "}기준
          </time>
        )}
      </div>

      <div className="live-keywords-list">
        {keywords.length === 0 && (
          <span className="live-keywords-loading">
            인기 검색어를 불러오는 중입니다.
          </span>
        )}

        {keywords.map((item) => {
          const trend = getTrendLabel(item);

          return (
            <button
              className="live-keyword-button"
              key={item.id}
              type="button"
              title={`${item.searchCount.toLocaleString("ko-KR")}회 검색`}
            >
              <span className="live-keyword-rank">
                {item.rank}
              </span>

              <span className="live-keyword-name">
                {item.keyword}
              </span>

              <strong className={trend.className}>
                {trend.text}
              </strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}
