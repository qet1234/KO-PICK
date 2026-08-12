"use client";

export type OperationEventType =
  | "search_success"
  | "search_no_results"
  | "place_card_click"
  | "map_open"
  | "directions_open"
  | "booking_open"
  | "app_error"
  | "app_crash"
  | "api_request";

export type OperationEvent = {
  eventType: OperationEventType;
  feature: string;
  route?: string;
  placeId?: string | number;
  placeName?: string;
  category?: string;
  durationMs?: number;
  statusCode?: number;
  success?: boolean;
  errorMessage?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export function trackOperationEvent(event: OperationEvent) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({ ...event, platform: "web" });

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(
      "/api/operations/events",
      new Blob([payload], { type: "application/json" }),
    );
    if (sent) return;
  }

  void fetch("/api/operations/events", {
    body: payload,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    method: "POST",
  }).catch(() => undefined);
}

export async function reportPlaceInformation(place: {
  id: string | number;
  name: string;
  category?: string | null;
  address?: string | null;
}) {
  const details = window.prompt(
    `${place.name}의 어떤 정보가 잘못되었나요?\n예: 폐업, 위치 오류, 상호명 변경`,
    "",
  );
  if (details === null) return false;

  const response = await fetch("/api/operations/place-reports", {
    body: JSON.stringify({
      address: place.address,
      category: place.category,
      details: details.trim() || null,
      placeId: String(place.id),
      placeName: place.name,
      platform: "web",
      reason: /폐업|없어/.test(details) ? "closed" : /위치|주소/.test(details) ? "wrong_location" : "incorrect_info",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error || "신고를 접수하지 못했습니다.");
  return true;
}
