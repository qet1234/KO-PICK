"use client";

import { useEffect, useState } from "react";

type Place = {
  id: number;
  rank: number;
  category: string;
  location: string;
  title: string;
  description: string;
  icon: string;
  rating: number;
  reviewCount: number;
  newReviews: number;
};

type PlaceResponse = {
  updatedAt: string;
  places: Place[];
};

export default function LiveRecommendations() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchPlaces() {
      try {
        const response = await fetch(
          `/api/trending-places?t=${Date.now()}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to load trending places.");
        }

        const data = (await response.json()) as PlaceResponse;

        if (active) {
          setPlaces(data.places);
          setUpdatedAt(new Date(data.updatedAt));
        }
      } catch (error) {
        console.error(error);
      }
    }

    const firstLoad = window.setTimeout(() => {
      void fetchPlaces();
    }, 0);

    const interval = window.setInterval(() => {
      void fetchPlaces();
    }, 30000);

    return () => {
      active = false;
      window.clearTimeout(firstLoad);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <div className="trending-live-status">
        <span className="trending-live-dot" aria-hidden />
        <strong>LIVE</strong>

        <span>
          {updatedAt
            ? `${updatedAt.toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })} 기준`
            : "리뷰 순위 업데이트 중"}
        </span>
      </div>

      <div className="recommendation-grid">
        {places.length === 0 && (
          <div className="recommendation-loading">
            인기 추천을 불러오는 중입니다.
          </div>
        )}

        {places.map((item) => (
          <article
            className="recommendation-card"
            key={item.id}
          >
            <div className="recommendation-image">
              <span className="recommendation-emoji">
                {item.icon}
              </span>

              <span className="recommendation-category">
                {item.category}
              </span>

              <span className="live-rank-badge">
                실시간 {item.rank}위
              </span>

              <button
                className="favorite-button"
                type="button"
                aria-label={`${item.title} 찜하기`}
              >
                ♡
              </button>
            </div>

            <div className="recommendation-content">
              <span className="recommendation-location">
                ● {item.location}
              </span>

              <h3>{item.title}</h3>
              <p>{item.description}</p>

              <div className="recommendation-footer">
                <strong>
                  ★ {item.rating.toFixed(1)}
                </strong>

                <span>
                  리뷰 {item.reviewCount.toLocaleString("ko-KR")}
                </span>
              </div>

              <span className="new-review-count">
                최근 리뷰 +{item.newReviews}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
