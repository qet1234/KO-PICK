import { springApiUrl } from "./spring-api";
import { getOrCreateVisitorId } from "./privacy-client";

export type KeywordSource = "search" | "trend";

export async function trackKeywordSearch(
  keyword: string,
  source: KeywordSource
) {
  try {
    await fetch(`${springApiUrl}/api/public/trending-keywords`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword,
        source,
        visitorId: getOrCreateVisitorId(),
      }),
      keepalive: true,
    });
  } catch {
    // 검색 이동은 활동 기록 실패와 무관하게 계속 진행합니다.
  }
}
