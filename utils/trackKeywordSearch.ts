export type KeywordSource = "search" | "trend";

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

export async function trackKeywordSearch(
  keyword: string,
  source: KeywordSource
) {
  try {
    await fetch("/api/trending-keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword,
        source,
        visitorId: getVisitorId(),
      }),
      keepalive: true,
    });
  } catch {
    // 검색 이동은 활동 기록 실패와 무관하게 계속 진행합니다.
  }
}
