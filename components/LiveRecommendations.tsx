"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { trackPlaceActivity } from "@/utils/trackPlaceActivity";

interface Place {
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
}

interface PlaceResponse {
  updatedAt: string;
  realtimeEnabled: boolean;
  places: Place[];
}

const paletteClasses = [
  "recommendation-beige",
  "recommendation-lime",
  "recommendation-pink",
  "recommendation-yellow",
];

function categoryQuery(category: string) {
  if (category.includes("카페")) return "카페";
  if (category.includes("축제")) return "축제";
  if (category.includes("음식") || category.includes("맛집")) return "음식";
  return "관광지";
}

export default function LiveRecommendations() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());

  const fetchPlaces = useCallback(async () => {
    try {
      const response = await fetch(`/api/trending-places?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("인기 추천을 불러오지 못했습니다.");

      const data = (await response.json()) as PlaceResponse;
      setPlaces(data.places);
      setUpdatedAt(new Date(data.updatedAt));
      setRealtimeEnabled(data.realtimeEnabled);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    const firstLoad = window.setTimeout(() => void fetchPlaces(), 0);
    const interval = window.setInterval(() => void fetchPlaces(), 30000);
    let supabase: ReturnType<typeof createClient> | null = null;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;

    try {
      supabase = createClient();
      channel = supabase
        .channel("public:trending-place-scores")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trending_place_scores" },
          () => void fetchPlaces()
        )
        .subscribe();
    } catch {
      // 환경변수 또는 Realtime 설정 전에는 30초 폴링으로 동작합니다.
    }

    return () => {
      window.clearTimeout(firstLoad);
      window.clearInterval(interval);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [fetchPlaces]);

  const toggleFavorite = (place: Place) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(place.id)) {
        next.delete(place.id);
      } else {
        next.add(place.id);
        void trackPlaceActivity(place, "favorite").then(fetchPlaces);
      }
      return next;
    });
  };

  return (
    <div className="kp-live-recommendations">
      <div className="kp-popular-live-status" aria-live="polite">
        <span className="kp-popular-live-dot" aria-hidden="true" />
        <strong>LIVE</strong>
        <span>
          {updatedAt
            ? `${updatedAt.toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })} 업데이트`
            : "인기 장소 연결 중"}
        </span>
        <small>{realtimeEnabled ? "실시간 활동 반영" : "TourAPI 장소 준비"}</small>
      </div>

      <div className="kp-recommendation-grid">
        {places.length === 0 && (
          <div className="kp-recommendation-loading">인기 추천을 불러오는 중입니다.</div>
        )}

        {places.map((place, index) => {
          const favorite = favorites.has(place.id);
          const activityTotal =
            place.detailCount + place.outboundCount + place.favoriteCount;
          const mapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(
            place.title
          )}`;

          return (
            <article
              className="kp-recommendation-card"
              data-rank={place.rank}
              key={place.id}
            >
              <div
                className={`kp-recommendation-image ${paletteClasses[index % paletteClasses.length]}`}
              >
                {place.imageUrl && (
                  <img
                    src={place.imageUrl}
                    alt={`${place.title} 대표 사진`}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <span className="kp-card-category">{place.category}</span>
                <button
                  className={`kp-save-button ${favorite ? "is-active" : ""}`}
                  type="button"
                  aria-label={`${place.title} 찜하기`}
                  aria-pressed={favorite}
                  onClick={() => toggleFavorite(place)}
                >
                  {favorite ? "♥" : "♡"}
                </button>
                <span className="kp-live-badge">실시간 {place.rank}위</span>
              </div>

              <div className="kp-recommendation-content">
                <small>{place.location}</small>
                <h3>{place.title}</h3>
                <p>{place.description}</p>
                <a
                  className="kp-recommendation-explore-link"
                  href={`/explore?category=${encodeURIComponent(
                    categoryQuery(place.category)
                  )}`}
                  onClick={() => void trackPlaceActivity(place, "detail")}
                >
                  같은 카테고리 보기 →
                </a>
              </div>

              <div className="kp-recommendation-meta">
                <div>
                  <strong>인기점수 {Math.round(place.popularityScore)}</strong>
                  <small>반응 {activityTotal.toLocaleString("ko-KR")}</small>
                </div>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => void trackPlaceActivity(place, "outbound")}
                >
                  지도에서 보기 ↗
                </a>
              </div>

              <div
                className="kp-recommendation-icon-slot"
                aria-label={`${place.category} 카테고리 아이콘`}
                key={`${place.id}-${place.icon}`}
              >
                <span className="kp-card-icon" aria-hidden="true">
                  {place.icon}
                </span>
                <div>
                  <small>LIVE CATEGORY</small>
                  <strong>{place.category}</strong>
                </div>
                <span className="kp-icon-sync">실시간 연동</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
