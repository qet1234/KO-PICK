import { NextRequest, NextResponse } from "next/server";

type NaverLocalItem = {
  title?: string;
  link?: string;
  category?: string;
  address?: string;
  roadAddress?: string;
};

type NaverWebItem = {
  title?: string;
  link?: string;
  description?: string;
};

const FOOD_CATEGORY = /음식점|한식|중식|일식|양식|분식|뷔페|카페|베이커리|술집|요리/;
const BOOKING_HOSTS = new Set(["booking.naver.com", "m.booking.naver.com"]);
const NAVER_REDIRECT_HOSTS = new Set(["openapi.naver.com", "naver.me", "link.naver.com"]);

function stripHtml(value = "") {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function normalizeName(value = "") {
  return stripHtml(value)
    .replace(/\[[^\]]*]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/(?:주식회사|유한회사|\(주\)|㈜)/g, "")
    .replace(/(?:본점|직영점)$/g, "")
    .replace(/[^0-9A-Za-z가-힣]/g, "")
    .toLowerCase();
}

function addressTokens(value = "") {
  return new Set(
    stripHtml(value)
      .replace(/(?:특별시|광역시|특별자치시|특별자치도)/g, "")
      .split(/[^0-9A-Za-z가-힣]+/)
      .map((token) => token.trim().toLowerCase())
      .filter((token) => token.length >= 2),
  );
}

function overlapScore(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  left.forEach((token) => {
    if (right.has(token)) overlap += 1;
  });
  return overlap / Math.min(left.size, right.size);
}

function matchScore(name: string, address: string, item: NaverLocalItem) {
  const requestedName = normalizeName(name);
  const foundName = normalizeName(item.title);
  if (!requestedName || !foundName) return 0;

  let nameScore = 0;
  if (requestedName === foundName) nameScore = 0.72;
  else if (
    Math.min(requestedName.length, foundName.length) >= 4 &&
    (requestedName.includes(foundName) || foundName.includes(requestedName))
  ) {
    nameScore = 0.62;
  }

  if (!nameScore) return 0;
  const foundAddress = stripHtml(item.roadAddress) || stripHtml(item.address);
  const addressScore = overlapScore(addressTokens(address), addressTokens(foundAddress)) * 0.28;
  return nameScore + addressScore;
}

async function searchNaver(query: string, clientId: string, clientSecret: string) {
  const url = new URL("https://openapi.naver.com/v1/search/local.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", "5");
  url.searchParams.set("sort", "random");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      next: { revalidate: 3600 },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`NAVER_LOCAL_${response.status}`);
    }
    const payload = (await response.json()) as { items?: NaverLocalItem[] };
    return payload.items ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

async function searchNaverBookingDocuments(
  query: string,
  clientId: string,
  clientSecret: string,
) {
  const url = new URL("https://openapi.naver.com/v1/search/webkr.json");
  url.searchParams.set("query", `${query} 네이버 예약`);
  url.searchParams.set("display", "10");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      next: { revalidate: 3600 },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`NAVER_WEB_${response.status}`);
    }
    const payload = (await response.json()) as { items?: NaverWebItem[] };
    return payload.items ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

function isDirectBookingUrl(url: URL) {
  if (BOOKING_HOSTS.has(url.hostname)) {
    return url.pathname.startsWith("/booking/");
  }
  return (
    ["m.place.naver.com", "pcmap.place.naver.com"].includes(url.hostname) &&
    /\/booking(?:\/|$)/.test(url.pathname)
  );
}

function bookingDocumentMatches(name: string, item: NaverWebItem) {
  const requestedName = normalizeName(name);
  const documentText = normalizeName(`${item.title || ""} ${item.description || ""}`);
  return (
    requestedName.length >= 3 &&
    documentText.length >= 3 &&
    (documentText.includes(requestedName) || requestedName.includes(documentText))
  );
}

async function resolveBookingUrl(value = "") {
  let current: URL;
  try {
    current = new URL(value);
  } catch {
    return null;
  }

  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    if (current.protocol !== "https:" && current.hostname === "openapi.naver.com") {
      current.protocol = "https:";
    }
    if (isDirectBookingUrl(current)) return current.toString();
    if (!NAVER_REDIRECT_HOSTS.has(current.hostname)) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
      });
      const location = response.headers.get("location");
      if (!location) return null;
      current = new URL(location, current);
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const name = (request.nextUrl.searchParams.get("name") || "").trim().slice(0, 120);
  const address = (request.nextUrl.searchParams.get("address") || "").trim().slice(0, 240);
  const source = (request.nextUrl.searchParams.get("source") || "").trim().toLowerCase();
  const category = (request.nextUrl.searchParams.get("category") || "").trim();

  if (
    !name ||
    !address ||
    !source.includes("tour") ||
    !/(?:음식|맛집|restaurant|카페|cafe)/i.test(category)
  ) {
    return NextResponse.json({
      matched: false,
      reason: "TourAPI 음식점·카페 후보의 장소명과 주소가 모두 필요합니다.",
    });
  }

  const clientId =
    process.env.NAVER_SEARCH_CLIENT_ID?.trim() || process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret =
    process.env.NAVER_SEARCH_CLIENT_SECRET?.trim() || process.env.NAVER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        matched: false,
        reason: "NAVER_SEARCH_CLIENT_ID와 NAVER_SEARCH_CLIENT_SECRET 설정이 필요합니다.",
      },
      { status: 503 },
    );
  }

  try {
    const items = await searchNaver(`${name} ${address}`, clientId, clientSecret);
    const ranked = items
      .filter((item) => FOOD_CATEGORY.test(stripHtml(item.category)))
      .map((item) => ({ item, score: matchScore(name, address, item) }))
      .sort((left, right) => right.score - left.score);

    const best = ranked[0];
    if (!best || best.score < 0.72) {
      return NextResponse.json({
        matched: false,
        reason: "TourAPI 장소와 충분히 일치하는 네이버 음식점을 찾지 못했습니다.",
      });
    }

    const matchedName = stripHtml(best.item.title);
    const matchedAddress = stripHtml(best.item.roadAddress) || stripHtml(best.item.address);
    const exactQuery = `${matchedName} ${matchedAddress}`;
    const bookingDocuments = await searchNaverBookingDocuments(
      exactQuery,
      clientId,
      clientSecret,
    );
    const matchingBookingDocuments = bookingDocuments.filter((item) =>
      bookingDocumentMatches(matchedName, item),
    );

    let bookingUrl: string | null = null;
    for (const document of matchingBookingDocuments) {
      bookingUrl = await resolveBookingUrl(document.link);
      if (bookingUrl) break;
    }

    return NextResponse.json({
      matched: true,
      bookable: Boolean(bookingUrl),
      confidence: Number(best.score.toFixed(2)),
      name: matchedName,
      address: matchedAddress,
      category: stripHtml(best.item.category),
      mapUrl: `https://map.naver.com/p/search/${encodeURIComponent(exactQuery)}`,
      bookingUrl,
      reason: bookingUrl ? undefined : "네이버 예약을 지원하지 않는 매장입니다.",
      notice: bookingUrl
        ? "네이버의 실제 예약 가능 시간과 좌석은 이동 후 확인됩니다."
        : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const permissionError = [
      "NAVER_LOCAL_401",
      "NAVER_LOCAL_403",
      "NAVER_WEB_401",
      "NAVER_WEB_403",
    ].includes(message);
    return NextResponse.json(
      {
        matched: false,
        reason: permissionError
          ? "네이버 개발자센터 애플리케이션에서 검색 API 권한을 활성화해 주세요."
          : "네이버 음식점·카페 확인 중 오류가 발생했습니다.",
      },
      { status: permissionError ? 503 : 502 },
    );
  }
}
