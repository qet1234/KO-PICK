"use client";

import { useEffect } from "react";
import CategoryExplorePage from "@/components/CategoryExplorePage";
import { springApiUrl } from "@/utils/spring-api";

type CategoryValue = "전체" | "음식" | "카페" | "축제" | "관광지";

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
        parsedUrl.searchParams.set("journeyType", "전체");
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

  return (
    <div data-journey={journey || undefined}>
      <CategoryExplorePage initialCategory={initialCategory} />
    </div>
  );
}
