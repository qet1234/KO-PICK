export type PlaceActivityType = "view" | "detail" | "outbound" | "favorite";

export interface TrackablePlace {
  id: number | string;
  name?: string;
  title?: string;
  region?: string;
  city?: string | null;
  location?: string;
  category: string;
  address?: string | null;
  description?: string;
  imageUrl?: string | null;
}

function getVisitorId() {
  const storageKey = "koreapick-visitor-id";
  const current = window.localStorage.getItem(storageKey);
  if (current) return current;

  const next =
    typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(storageKey, next);
  return next;
}

export async function trackPlaceActivity(
  place: TrackablePlace,
  eventType: PlaceActivityType
) {
  try {
    await fetch("/api/trending-places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: String(place.id),
        name: place.name ?? place.title ?? "",
        region: place.region ?? place.location?.split(/\s+/)[0] ?? "전국",
        city: place.city ?? place.location?.split(/\s+/).slice(1).join(" ") ?? null,
        category: place.category,
        address: place.address ?? place.description ?? null,
        imageUrl: place.imageUrl ?? null,
        eventType,
        visitorId: getVisitorId(),
      }),
      keepalive: true,
    });
  } catch {
    // 활동 기록 실패가 장소 탐색 자체를 방해하지 않도록 무시합니다.
  }
}
