"use client";

import { useCallback, useEffect, useState } from "react";
import { springApiUrl } from "@/utils/spring-api";

interface HeroPick {
  id: string;
  rank: number;
  category: string;
  location: string;
  title: string;
  popularityScore: number;
}

interface HeroPickResponse {
  updatedAt: string;
  places: HeroPick[];
}

const fallbackPicks: HeroPick[] = [
  {
    id: "hero-seoul",
    rank: 1,
    category: "관광지",
    location: "서울",
    title: "한강 노을 데이트 코스",
    popularityScore: 98,
  },
  {
    id: "hero-cafe",
    rank: 2,
    category: "카페",
    location: "서울 성수",
    title: "성수 감성 카페 투어",
    popularityScore: 94,
  },
  {
    id: "hero-busan",
    rank: 3,
    category: "관광지",
    location: "부산",
    title: "바다를 따라 걷는 하루",
    popularityScore: 91,
  },
];

const noteThemes = ["is-lime", "is-coral", "is-sky", "is-yellow"];

function exploreCategory(category: string) {
  if (category.includes("카페")) return "카페";
  if (category.includes("축제")) return "축제";
  if (category.includes("음식") || category.includes("맛집")) return "음식";
  return "관광지";
}

export default function HeroLivePick() {
  const [picks, setPicks] = useState<HeroPick[]>(fallbackPicks);
  const [activeIndex, setActiveIndex] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const fetchPicks = useCallback(async () => {
    try {
      const response = await fetch(`${springApiUrl}/api/public/trending-places?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) return;

      const data = (await response.json()) as HeroPickResponse;
      if (data.places.length > 0) {
        setPicks(data.places.slice(0, 6));
        setUpdatedAt(new Date(data.updatedAt));
      }
    } catch {
      // 연결 전에는 기본 추천을 유지합니다.
    }
  }, []);

  useEffect(() => {
    const firstLoad = window.setTimeout(() => void fetchPicks(), 0);
    const refreshInterval = window.setInterval(() => void fetchPicks(), 30000);

    return () => {
      window.clearTimeout(firstLoad);
      window.clearInterval(refreshInterval);
    };
  }, [fetchPicks]);

  useEffect(() => {
    const rotationInterval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % picks.length);
    }, 5500);

    return () => window.clearInterval(rotationInterval);
  }, [picks.length]);

  const currentIndex = activeIndex % picks.length;
  const pick = picks[currentIndex];
  const category = exploreCategory(pick.category);

  return (
    <article className="kp-editor-pick kp-live-pick" aria-live="polite">
      <div className="kp-live-pick-header">
        <span className="kp-card-number">
          {String(pick.rank || currentIndex + 1).padStart(2, "0")}
        </span>
        <span className="kp-hero-live-status">
          <i aria-hidden="true" />
          LIVE
        </span>
      </div>

      <a
        className={`kp-editor-note ${noteThemes[currentIndex % noteThemes.length]}`}
        href={`/explore?category=${encodeURIComponent(category)}`}
        key={pick.id}
      >
        <small>{pick.location} · {pick.category}</small>
        <strong>
          지금 뜨는
          <br />
          오늘의 픽
        </strong>
        <span>추천 장소 확인하기 ↗</span>
      </a>

      <div className="kp-editor-footer">
        <div>
          <small>REAL-TIME TREND</small>
          <p>{pick.title}</p>
          <span>
            {updatedAt
              ? `${updatedAt.toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })} 업데이트`
              : "실시간 추천 연결 중"}
          </span>
        </div>

        <strong>{Math.round(pick.popularityScore)}</strong>
      </div>

      <div className="kp-live-pick-pagination" aria-label="추천 장소 선택">
        {picks.map((item, index) => (
          <button
            className={index === currentIndex ? "is-active" : ""}
            type="button"
            aria-label={`${index + 1}번째 추천: ${item.title}`}
            aria-pressed={index === currentIndex}
            key={item.id}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>
    </article>
  );
}
