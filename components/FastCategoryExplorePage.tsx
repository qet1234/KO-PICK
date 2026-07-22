"use client";

import { useEffect, useState } from "react";
import CategoryExplorePage from "@/components/CategoryExplorePage";
import ExploreUxGuards from "@/components/ExploreUxGuards";
import PlaceNavigationChooser from "@/components/PlaceNavigationChooser";
import { springApiUrl } from "@/utils/spring-api";

type CategoryValue = "전체" | "음식" | "카페" | "축제" | "관광지";

interface FastCategoryExplorePageProps {
  initialCategory: CategoryValue;
}

type CachedResponse = {
  expiresAt: number;
  staleUntil: number;
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const STALE_TTL_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY = "kopick:tour-place-cache:v4";
const LEGACY_STORAGE_KEYS = [
  "kopick:tour-place-cache:v2",
  "kopick:tour-place-cache:v3",
];
const MAX_CACHE_ENTRIES = 80;

const responseCache = new Map<string, CachedResponse>();
const pendingRequests = new Map<string, Promise<Response>>();
let cacheLoaded = false;

function isTourPlacesRequest(input: RequestInfo | URL) {
  const rawUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  return rawUrl.startsWith(`${springApiUrl}/api/public/tour/places`);
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

function isCacheableResponse(url: string, body: string) {
  const parsed = new URL(url, window.location.origin);
  if (parsed.searchParams.get("bookingOnly") !== "true") return true;

  try {
    const payload = JSON.parse(body) as { bookingFilter?: unknown };
    return Boolean(payload.bookingFilter);
  } catch {
    return false;
  }
}

function loadCacheFromSession() {
  if (cacheLoaded) return;
  cacheLoaded = true;

  try {
    LEGACY_STORAGE_KEYS.forEach((key) => window.sessionStorage.removeItem(key));
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const entries = JSON.parse(raw) as [string, CachedResponse][];
    const now = Date.now();

    for (const [url, cached] of entries) {
      if (cached.staleUntil > now && isCacheableResponse(url, cached.body)) {
        responseCache.set(url, cached);
      }
    }
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}

function persistCache() {
  try {
    const now = Date.now();
    const entries = Array.from(responseCache.entries())
      .filter(([, cached]) => cached.staleUntil > now)
      .sort((a, b) => b[1].expiresAt - a[1].expiresAt)
      .slice(0, MAX_CACHE_ENTRIES);

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // 저장 공간 제한이 발생해도 장소 조회 자체는 계속 동작합니다.
  }
}

function saveResponse(url: string, response: Response, body: string) {
  if (!isCacheableResponse(url, body)) return;

  const now = Date.now();
  responseCache.set(url, {
    expiresAt: now + CACHE_TTL_MS,
    staleUntil: now + STALE_TTL_MS,
    status: response.status,
    statusText: response.statusText,
    headers: Array.from(response.headers.entries()),
    body,
  });
  persistCache();
}

export default function FastCategoryExplorePage({
  initialCategory,
}: FastCategoryExplorePageProps) {
  const [fetchReady, setFetchReady] = useState(false);

  useEffect(() => {
    loadCacheFromSession();

    const originalFetch = window.fetch.bind(window);
    const activeControllers = new Map<string, AbortController>();

    const refreshInBackground = (url: string, init?: RequestInit) => {
      if (pendingRequests.has(url)) return;

      const request = originalFetch(url, {
        ...init,
        cache: "no-store",
      })
        .then(async (response) => {
          if (response.ok) {
            const body = await response.clone().text();
            saveResponse(url, response, body);
          }
          return response;
        })
        .finally(() => {
          pendingRequests.delete(url);
        });

      pendingRequests.set(url, request);
    };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!isTourPlacesRequest(input)) {
        return originalFetch(input, init);
      }

      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const method = (init?.method ?? "GET").toUpperCase();

      if (method !== "GET") {
        return originalFetch(input, init);
      }

      const now = Date.now();
      const cached = responseCache.get(url);

      if (cached?.expiresAt && cached.expiresAt > now) {
        return responseFromCache(cached);
      }

      if (cached?.staleUntil && cached.staleUntil > now) {
        refreshInBackground(url, init);
        return responseFromCache(cached);
      }

      if (cached) {
        responseCache.delete(url);
        persistCache();
      }

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

      const request = originalFetch(input, {
        ...init,
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          if (response.ok) {
            const body = await response.clone().text();
            saveResponse(url, response, body);
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

    setFetchReady(true);

    return () => {
      window.fetch = originalFetch;
      activeControllers.forEach((controller) => controller.abort());
      activeControllers.clear();
    };
  }, []);

  if (!fetchReady) {
    return (
      <main className="kp-explore-page">
        <div className="kp-explore-map-state">추천 장소를 준비하는 중입니다.</div>
      </main>
    );
  }

  return (
    <>
      <CategoryExplorePage initialCategory={initialCategory} />
      <PlaceNavigationChooser />
      <ExploreUxGuards />
    </>
  );
}
