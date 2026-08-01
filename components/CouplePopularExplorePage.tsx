"use client";

import { useEffect, useState } from "react";
import FastCategoryExplorePage from "@/components/FastCategoryExplorePage";
import { tourPlacesApiUrl } from "@/utils/spring-api";

type CategoryValue = "전체" | "음식" | "카페" | "축제" | "관광지";

type Props = {
  initialCategory: CategoryValue;
  initialDetail?: string;
};

function rawRequestUrl(input: RequestInfo | URL) {
  return typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function CouplePopularExplorePage({
  initialCategory,
  initialDetail = "전체",
}: Props) {
  const [interceptorReady, setInterceptorReady] = useState(false);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? "GET").toUpperCase();
      const requestUrl = new URL(rawRequestUrl(input), window.location.origin);
      const isCouplePlaceRequest =
        method === "GET" &&
        requestUrl.pathname === tourPlacesApiUrl &&
        requestUrl.searchParams.get("mode") !== "subregions" &&
        requestUrl.searchParams.get("journey") === "커플";

      if (!isCouplePlaceRequest) {
        return originalFetch(input, init);
      }

      const naverUrl = new URL("/api/naver/couple-places", window.location.origin);
      requestUrl.searchParams.forEach((value, key) => {
        naverUrl.searchParams.append(key, value);
      });

      try {
        const naverResponse = await originalFetch(naverUrl, init);
        if (naverResponse.ok) {
          const payload = await naverResponse.clone().json().catch(() => null) as
            | { places?: unknown[] }
            | null;
          if (Array.isArray(payload?.places) && payload.places.length > 0) {
            return naverResponse;
          }
        }
      } catch (error) {
        if (isAbortError(error)) throw error;
      }

      return originalFetch(input, init);
    };

    setInterceptorReady(true);
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    if (!interceptorReady) return;

    const descriptions: Record<string, string> = {
      전체: "네이버 검색 반응이 많은 데이트 장소 우선",
      카페: "감성·뷰·베이커리·디저트 카페",
      "데이트 관광지": "산책·야경·전시·실내 데이트",
      축제: "계절·야간·문화예술 행사",
      음식: "브런치·파스타·분위기 좋은 맛집",
    };

    const updateCopy = () => {
      const root = document.querySelector<HTMLElement>(
        '.kp-journey-explore[data-journey="커플"]',
      );
      if (!root) return;

      const intro = root.querySelector<HTMLElement>(".kp-journey-category-copy p");
      if (intro) {
        intro.textContent =
          "네이버 지역 검색의 카페·블로그 리뷰 반응순을 우선 반영하고, 검색 결과가 부족한 지역과 축제는 TourAPI로 보완합니다.";
      }

      root.querySelectorAll<HTMLElement>(".kp-journey-category-buttons button").forEach((button) => {
        const label = button.querySelector("strong")?.textContent?.trim() || "";
        const description = button.querySelector<HTMLElement>("small");
        if (description && descriptions[label]) description.textContent = descriptions[label];
      });

      const source = root.querySelector<HTMLElement>(".kp-explore-source");
      const sourceLines = source?.querySelectorAll<HTMLElement>("span");
      if (sourceLines?.[0]) {
        sourceLines[0].textContent =
          "커플 장소 우선순위: NAVER 지역 검색 API · 검색 부족 시 한국관광공사 TourAPI";
      }
      if (sourceLines?.[1]) sourceLines[1].textContent = "지도·장소 상세 확인: NAVER Maps";
      const sourceNote = source?.querySelector<HTMLElement>("small");
      if (sourceNote) {
        sourceNote.textContent =
          "카페·블로그 리뷰 개수 순 정렬만 활용하며 다른 서비스의 리뷰 본문·별점·사진은 복사하거나 저장하지 않습니다.";
      }
    };

    updateCopy();
    const observer = new MutationObserver(updateCopy);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [interceptorReady]);

  if (!interceptorReady) {
    return <div aria-live="polite">커플 인기 장소를 준비하고 있습니다.</div>;
  }

  return (
    <FastCategoryExplorePage
      initialCategory={initialCategory}
      initialDetail={initialDetail}
      journey="커플"
    />
  );
}
