"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CategoryExplorePage from "@/components/CategoryExplorePage";
import { springApiUrl } from "@/utils/spring-api";

type CategoryValue = "전체" | "음식" | "카페" | "축제" | "관광지";

type JourneyMenu = {
  label: string;
  icon: string;
  description: string;
};

interface FastCategoryExplorePageProps {
  initialCategory: CategoryValue;
  initialDetail?: string;
  journey?: string;
}

type CachedResponse = {
  expiresAt: number;
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
};

const journeyMenus: Record<string, JourneyMenu[]> = {
  혼자: [
    { label: "전체", icon: "✦", description: "혼자 즐기기 좋은 장소 전체" },
    { label: "혼밥", icon: "식", description: "부담 없이 편하게 먹는 한 끼" },
    { label: "조용한 카페", icon: "잔", description: "오래 머물기 좋은 차분한 공간" },
    { label: "혼자 둘러보기", icon: "길", description: "산책·전시·명소를 천천히" },
  ],
  커플: [
    { label: "전체", icon: "♡", description: "데이트 장소를 한 번에 확인" },
    { label: "카페", icon: "잔", description: "분위기 좋은 데이트 카페" },
    { label: "데이트 관광지", icon: "길", description: "산책·전시·야경 명소" },
    { label: "축제", icon: "별", description: "함께 즐기는 계절 행사" },
    { label: "음식", icon: "식", description: "데이트에 어울리는 맛집" },
  ],
};

const journeyDescriptions: Record<string, string> = {
  혼자: "혼밥부터 조용한 카페, 혼자 천천히 둘러보기 좋은 장소만 모았습니다.",
  커플: "카페·관광지·축제·맛집을 한 지도에서 비교해 데이트 장소를 고를 수 있습니다.",
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const responseCache = new Map<string, CachedResponse>();
const pendingRequests = new Map<string, Promise<Response>>();

function rawRequestUrl(input: RequestInfo | URL) {
  return typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;
}

function isTourPlacesRequest(input: RequestInfo | URL) {
  return rawRequestUrl(input).startsWith(`${springApiUrl}/api/public/tour/places`);
}

function requestGroup(url: string) {
  const parsed = new URL(url, window.location.origin);
  return parsed.searchParams.get("mode") === "subregions"
    ? "subregions"
    : "places";
}

function responseFromCache(cached: CachedResponse) {
  return new Response(cached.body, {
    status: cached.status,
    statusText: cached.statusText,
    headers: cached.headers,
  });
}

export default function FastCategoryExplorePage({
  initialCategory,
  initialDetail = "전체",
  journey = "",
}: FastCategoryExplorePageProps) {
  const availableJourneyMenus = journeyMenus[journey] ?? [];
  const [selectedJourneyType, setSelectedJourneyType] = useState("전체");
  const [menuHost, setMenuHost] = useState<HTMLElement | null>(null);
  const journeyTypeRef = useRef(selectedJourneyType);
  journeyTypeRef.current = selectedJourneyType;

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const activeControllers = new Map<string, AbortController>();

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!isTourPlacesRequest(input)) {
        return originalFetch(input, init);
      }

      const originalUrl = rawRequestUrl(input);
      const parsedUrl = new URL(originalUrl, window.location.origin);
      const isSubregionRequest = parsedUrl.searchParams.get("mode") === "subregions";

      if (journey && !isSubregionRequest) {
        parsedUrl.searchParams.set("journey", journey);
        parsedUrl.searchParams.set("journeyType", journeyTypeRef.current);
        parsedUrl.searchParams.set("category", "전체");
        parsedUrl.searchParams.delete("detailType");
      }

      const url = parsedUrl.toString();
      const method = (init?.method ?? "GET").toUpperCase();

      if (method !== "GET") {
        return originalFetch(url, init);
      }

      const cached = responseCache.get(url);
      if (cached && cached.expiresAt > Date.now()) {
        return responseFromCache(cached);
      }
      if (cached) responseCache.delete(url);

      const existingPending = pendingRequests.get(url);
      if (existingPending) {
        return (await existingPending).clone();
      }

      const group = requestGroup(url);
      activeControllers.get(group)?.abort();

      const controller = new AbortController();
      activeControllers.set(group, controller);

      const upstreamSignal = init?.signal;
      const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);
      upstreamSignal?.addEventListener("abort", abortFromUpstream, { once: true });

      const request = originalFetch(url, {
        ...init,
        signal: controller.signal,
      })
        .then(async (response) => {
          if (response.ok) {
            const body = await response.clone().text();
            responseCache.set(url, {
              expiresAt: Date.now() + CACHE_TTL_MS,
              status: response.status,
              statusText: response.statusText,
              headers: Array.from(response.headers.entries()),
              body,
            });
          }
          return response;
        })
        .finally(() => {
          pendingRequests.delete(url);
          upstreamSignal?.removeEventListener("abort", abortFromUpstream);
          if (activeControllers.get(group) === controller) {
            activeControllers.delete(group);
          }
        });

      pendingRequests.set(url, request);
      return (await request).clone();
    };

    return () => {
      window.fetch = originalFetch;
      activeControllers.forEach((controller) => controller.abort());
      activeControllers.clear();
    };
  }, [journey]);

  useEffect(() => {
    if (!journey) {
      setMenuHost(null);
      return;
    }

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const section = document.querySelector<HTMLElement>(
        ".kp-explore-filter-section",
      );
      const regionSelects = section?.querySelector<HTMLElement>(
        ".kp-explore-region-selects",
      );

      if (section && regionSelects) {
        let host = section.querySelector<HTMLElement>(
          ".kp-journey-menu-host",
        );
        if (!host) {
          host = document.createElement("div");
          host.className = "kp-journey-menu-host";
          section.insertBefore(host, regionSelects);
        }
        setMenuHost(host);
        window.clearInterval(timer);
      } else if (attempts >= 30) {
        window.clearInterval(timer);
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [journey, selectedJourneyType]);

  useEffect(() => {
    if (!journey) return;

    const updateLabels = () => {
      const headerTitle = document.querySelector<HTMLElement>(
        ".kp-explore-header > div > strong",
      );
      const pageTitle = document.querySelector<HTMLElement>(
        ".kp-explore-filter-section h1",
      );
      const eyebrow = document.querySelector<HTMLElement>(
        ".kp-explore-eyebrow",
      );
      const mapCategory = document.querySelector<HTMLElement>(
        ".kp-explore-map-label span",
      );

      if (headerTitle) headerTitle.textContent = `${journey} 맞춤 지도`;
      if (pageTitle) pageTitle.textContent = `${journey} 장소 찾기`;
      if (eyebrow) eyebrow.textContent = "RELATIONSHIP PLACE MAP";
      if (mapCategory) mapCategory.textContent = selectedJourneyType;
    };

    const timer = window.setTimeout(updateLabels, 80);
    return () => window.clearTimeout(timer);
  }, [journey, selectedJourneyType]);

  useEffect(() => {
    if (journey || !initialDetail || initialDetail === "전체") return;

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          ".kp-explore-detail-buttons button",
        ),
      );
      const target = buttons.find(
        (button) => button.textContent?.trim() === initialDetail,
      );

      if (target) {
        target.click();
        window.clearInterval(timer);
      } else if (attempts >= 20) {
        window.clearInterval(timer);
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [initialDetail, initialCategory, journey]);

  const journeyMenu = availableJourneyMenus.length > 0 && menuHost
    ? createPortal(
        <section className="kp-journey-category-menu" aria-label={`${journey} 장소 유형`}>
          <div className="kp-journey-category-copy">
            <div>
              <small>KO-PICK FOR {journey === "혼자" ? "ME" : "TWO"}</small>
              <strong>{journey} 맞춤 카테고리</strong>
            </div>
            <span>{selectedJourneyType}</span>
            <p>{journeyDescriptions[journey]}</p>
          </div>

          <div className="kp-journey-category-buttons">
            {availableJourneyMenus.map((menu) => (
              <button
                type="button"
                className={selectedJourneyType === menu.label ? "is-active" : ""}
                aria-pressed={selectedJourneyType === menu.label}
                key={menu.label}
                onClick={() => setSelectedJourneyType(menu.label)}
              >
                <span aria-hidden="true">{menu.icon}</span>
                <div>
                  <strong>{menu.label}</strong>
                  <small>{menu.description}</small>
                </div>
              </button>
            ))}
          </div>
        </section>,
        menuHost,
      )
    : null;

  return (
    <div className="kp-journey-explore" data-journey={journey || undefined}>
      <CategoryExplorePage
        key={`${journey || "default"}-${selectedJourneyType}`}
        initialCategory={journey ? "전체" : initialCategory}
      />
      {journeyMenu}
    </div>
  );
}
