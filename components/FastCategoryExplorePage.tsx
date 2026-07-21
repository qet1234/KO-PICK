"use client";

import { useEffect } from "react";
import CategoryExplorePage from "@/components/CategoryExplorePage";
import { springApiUrl } from "@/utils/spring-api";

type CategoryValue = "전체" | "음식" | "카페" | "축제" | "관광지";

interface FastCategoryExplorePageProps {
  initialCategory: CategoryValue;
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

export default function FastCategoryExplorePage({
  initialCategory,
}: FastCategoryExplorePageProps) {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const activeControllers = new Map<string, AbortController>();

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

      const request = originalFetch(input, {
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
  }, []);

  return <CategoryExplorePage initialCategory={initialCategory} />;
}
