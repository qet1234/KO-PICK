"use client";

import { useEffect } from "react";
import { trackOperationEvent } from "@/utils/operations-telemetry";

function featureFromPath(path: string) {
  if (path.startsWith("/api/tour")) return "place_search";
  if (path.startsWith("/api/recommend")) return "recommendations";
  if (path.startsWith("/api/naver/dining")) return "office_dining";
  if (path.startsWith("/api/naver/booking")) return "reservations";
  if (path.startsWith("/api/weather")) return "weather";
  if (path.startsWith("/api/course-shares")) return "sharing";
  return "web_api";
}

function resultCount(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as { places?: unknown; items?: unknown };
  if (Array.isArray(value.places)) return value.places.length;
  if (Array.isArray(value.items)) return value.items.length;
  return null;
}

function searchMetadata(url: URL, count: number) {
  const result: Record<string, string | number | boolean | null> = { resultCount: count };
  const allowedParams = [
    "region",
    "category",
    "district",
    "locality",
    "query",
    "relationship",
    "budget",
    "mood",
    "foodType",
    "foodDetail",
    "openNow",
  ];
  for (const key of allowedParams) {
    const value = url.searchParams.get(key)?.trim();
    if (value) result[key] = value.slice(0, 120);
  }
  return result;
}

function isSearchRequest(url: URL) {
  if (url.pathname === "/api/tour/places") {
    return url.searchParams.get("mode") !== "subregions";
  }
  return url.pathname === "/api/recommend" || url.pathname === "/api/naver/dining-search";
}

export default function OperationsTelemetry() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(raw, window.location.origin);
      const monitored = url.origin === window.location.origin
        && url.pathname.startsWith("/api/")
        && !url.pathname.startsWith("/api/operations/")
        && !url.pathname.startsWith("/api/traffic");
      if (!monitored) return originalFetch(input, init);

      const started = performance.now();
      try {
        const response = await originalFetch(input, init);
        const durationMs = Math.round(performance.now() - started);
        trackOperationEvent({
          durationMs,
          eventType: "api_request",
          feature: featureFromPath(url.pathname),
          route: url.pathname,
          statusCode: response.status,
          success: response.ok,
        });

        if (response.ok && isSearchRequest(url)) {
          void response.clone().json().then((payload: unknown) => {
            const count = resultCount(payload);
            if (count === null) return;
            trackOperationEvent({
              eventType: count > 0 ? "search_success" : "search_no_results",
              feature: featureFromPath(url.pathname),
              route: `${url.pathname}?${url.searchParams.toString().slice(0, 220)}`,
              metadata: searchMetadata(url, count),
            });
          }).catch(() => undefined);
        }
        return response;
      } catch (error) {
        trackOperationEvent({
          durationMs: Math.round(performance.now() - started),
          errorMessage: error instanceof Error ? error.message : "Network request failed",
          eventType: "api_request",
          feature: featureFromPath(url.pathname),
          route: url.pathname,
          success: false,
        });
        throw error;
      }
    };

    const onError = (event: ErrorEvent) => {
      trackOperationEvent({
        errorMessage: event.message || "Unhandled web error",
        eventType: "app_error",
        feature: "web_runtime",
        route: window.location.pathname,
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      trackOperationEvent({
        errorMessage: reason instanceof Error ? reason.message : String(reason ?? "Unhandled promise rejection"),
        eventType: "app_error",
        feature: "web_runtime",
        route: window.location.pathname,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
