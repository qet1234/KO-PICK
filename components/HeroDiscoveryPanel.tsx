"use client";

import { useCallback, useEffect, useState } from "react";
import { springApiUrl } from "@/utils/spring-api";
import { trackPlaceActivity } from "@/utils/trackPlaceActivity";

type HeroPlace = {
  id: string;
  rank: number;
  category: string;
  location: string;
  title: string;
  description: string;
  imageUrl: string | null;
  icon: string;
  popularityScore: number;
};

type TrendingResponse = {
  updatedAt: string;
  realtimeEnabled: boolean;
  places: HeroPlace[];
};

const quickMenus = [
  { label: "내 주변", href: "#regions", icon: "⌖" },
  { label: "데이트", href: "/explore?category=카페&keyword=데이트", icon: "♡" },
  { label: "친구 모임", href: "/explore?category=음식&keyword=친구+모임", icon: "◎" },
  { label: "가족", href: "/explore?category=관광지&keyword=가족", icon: "⌂" },
];

const categories = [
  { label: "맛집", value: "음식" },
  { label: "카페", value: "카페" },
  { label: "축제", value: "축제" },
  { label: "관광지", value: "관광지" },
];

function naverMapUrl(place: HeroPlace) {
  const query = encodeURIComponent(`${place.title} ${place.location}`.trim());
  return `https://map.naver.com/p/search/${query}`;
}

export default function HeroDiscoveryPanel() {
  const [places, setPlaces] = useState<HeroPlace[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPlaces = useCallback(async () => {
    try {
      const response = await fetch(
        `${springApiUrl}/api/public/trending-places?t=${Date.now()}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("인기 장소를 불러오지 못했습니다.");

      const payload = (await response.json()) as TrendingResponse;
      setPlaces(Array.isArray(payload.places) ? payload.places.slice(0, 4) : []);
      setUpdatedAt(payload.updatedAt ? new Date(payload.updatedAt) : new Date());
    } catch (error) {
      console.error("hero discovery places error", error);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlaces();
    const intervalId = window.setInterval(() => void loadPlaces(), 30_000);
    return () => window.clearInterval(intervalId);
  }, [loadPlaces]);

  return (
    <aside className="kp-hero-discovery" aria-label="빠른 장소 탐색">
      <div className="kp-hero-discovery-topbar">
        <a className="kp-hero-location" href="#regions">
          <span>현재 탐색 지역</span>
          <strong>전국 · 지역 선택</strong>
        </a>
        <a className="kp-hero-all-link" href="/explore?category=전체">
          전체 보기 →
        </a>
      </div>

      <div className="kp-hero-quick-menu" aria-label="빠른 목적 선택">
        {quickMenus.map((menu) => (
          <a href={menu.href} key={menu.label}>
            <span aria-hidden="true">{menu.icon}</span>
            <strong>{menu.label}</strong>
          </a>
        ))}
      </div>

      <div className="kp-hero-category-row" aria-label="장소 카테고리">
        {categories.map((category) => (
          <a
            href={`/explore?category=${encodeURIComponent(category.value)}`}
            key={category.value}
          >
            {category.label}
          </a>
        ))}
      </div>

      <div className="kp-hero-discovery-heading">
        <div>
          <small>LIVE DISCOVERY</small>
          <h2>지금 많이 찾는 곳</h2>
        </div>
        <span>
          <i aria-hidden="true" />
          {updatedAt
            ? `${updatedAt.toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })} 업데이트`
            : "실시간 연결 중"}
        </span>
      </div>

      <div className="kp-hero-place-grid">
        {loading &&
          Array.from({ length: 4 }, (_, index) => (
            <div className="kp-hero-place-card is-loading" key={index}>
              <div />
              <span />
              <strong />
            </div>
          ))}

        {!loading && places.length === 0 && (
          <div className="kp-hero-place-empty">
            <strong>실시간 장소를 준비하고 있습니다.</strong>
            <p>카테고리나 지역을 선택하면 전체 장소를 바로 확인할 수 있어요.</p>
            <a href="/explore?category=전체">장소 둘러보기 →</a>
          </div>
        )}

        {places.map((place) => (
          <article className="kp-hero-place-card" key={place.id}>
            <a
              className="kp-hero-place-image"
              href={naverMapUrl(place)}
              target="_blank"
              rel="noreferrer"
              onClick={() => void trackPlaceActivity(place, "outbound")}
            >
              {place.imageUrl ? (
                <img
                  src={place.imageUrl}
                  alt={`${place.title} 대표 사진`}
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              <span className="kp-hero-place-icon" aria-hidden="true">
                {place.icon || "●"}
              </span>
              <small>실시간 {place.rank}위</small>
            </a>

            <div className="kp-hero-place-copy">
              <span>{place.location || "전국"} · {place.category}</span>
              <h3>{place.title}</h3>
              <p>{place.description || "지금 관심이 높아지고 있는 장소입니다."}</p>
              <div>
                <strong>인기 {Math.round(place.popularityScore || 0)}</strong>
                <a
                  href={naverMapUrl(place)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => void trackPlaceActivity(place, "outbound")}
                >
                  네이버 지도 ↗
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
