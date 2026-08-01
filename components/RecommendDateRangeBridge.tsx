"use client";

import { useEffect } from "react";

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number) {
  const date = parseDateKey(value);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function rawRequestUrl(input: RequestInfo | URL) {
  return typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;
}

export default function RecommendDateRangeBridge() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const forecastLimit = addDays(dateKey(new Date()), 13);
    const patchedFetch: typeof window.fetch = async (input, init) => {
      const url = new URL(rawRequestUrl(input), window.location.origin);
      const requestedDate = url.searchParams.get("date") || "";
      if (url.pathname === "/api/weather" && requestedDate > forecastLimit) {
        return new Response(
          JSON.stringify({ daily: [], indoorRecommended: false, forecastUnavailable: true }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store",
            },
          },
        );
      }
      return originalFetch(input, init);
    };
    window.fetch = patchedFetch;

    const enhanced = new Set<HTMLInputElement>();
    const extendDateRange = () => {
      document
        .querySelectorAll<HTMLInputElement>('.recommend-date-field input[type="date"]')
        .forEach((input) => {
          const min = input.min || dateKey(new Date());
          const extendedMax = addDays(min, 365);
          if (!input.dataset.originalCalendarMax) {
            input.dataset.originalCalendarMax = input.max || "";
          }
          input.dataset.calendarMax = extendedMax;
          input.max = extendedMax;
          enhanced.add(input);
        });
    };

    extendDateRange();
    const observer = new MutationObserver(extendDateRange);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (window.fetch === patchedFetch) window.fetch = originalFetch;
      enhanced.forEach((input) => {
        input.max = input.dataset.originalCalendarMax || "";
        delete input.dataset.originalCalendarMax;
        delete input.dataset.calendarMax;
      });
    };
  }, []);

  return null;
}
