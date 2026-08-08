export type NaverLocalItem = {
  title?: string;
  category?: string;
  address?: string;
  roadAddress?: string;
  mapx?: string;
  mapy?: string;
};

export type TourPlaceForVerification = {
  name: string;
  address: string | null;
  [key: string]: unknown;
};

export type NaverVerifiedPlace<T extends TourPlaceForVerification> = T & {
  naverVerified: true;
  naverName: string;
  naverAddress: string;
  naverCategory: string;
  naverMapUrl: string;
  naverMatchConfidence: number;
  naverLatitude: number | null;
  naverLongitude: number | null;
};

type CachedMatch = {
  expiresAt: number;
  match: VerifiedMatch | null;
};

type VerifiedMatch = {
  name: string;
  address: string;
  category: string;
  confidence: number;
  latitude: number | null;
  longitude: number | null;
};

const NAVER_LOCAL_SEARCH_URL = "https://openapi.naver.com/v1/search/local.json";
const POSITIVE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const NEGATIVE_CACHE_TTL_MS = 30 * 60 * 1000;
const SEARCH_TIMEOUT_MS = 6_000;
const VERIFY_CONCURRENCY = 4;
const MATCH_THRESHOLD = 0.8;
const MIN_ADDRESS_SCORE = 0.55;
const matchCache = new Map<string, CachedMatch>();

export class NaverPlaceVerificationError extends Error {
  readonly status: number | null;

  constructor(
    message: string,
    status: number | null = null,
  ) {
    super(message);
    this.name = "NaverPlaceVerificationError";
    this.status = status;
  }
}

export function stripNaverHtml(value = "") {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function normalizeAdministrativeNames(value: string) {
  return value
    .replace(/서울특별시/g, "서울")
    .replace(/부산광역시/g, "부산")
    .replace(/대구광역시/g, "대구")
    .replace(/인천광역시/g, "인천")
    .replace(/광주광역시/g, "광주")
    .replace(/대전광역시/g, "대전")
    .replace(/울산광역시/g, "울산")
    .replace(/세종특별자치시/g, "세종")
    .replace(/제주특별자치도/g, "제주")
    .replace(/강원특별자치도/g, "강원")
    .replace(/전북특별자치도/g, "전북");
}

function normalizeName(value = "") {
  return stripNaverHtml(value)
    .replace(/\[[^\]]*]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/(?:주식회사|유한회사|㈜|\(주\))/g, "")
    .replace(/[^0-9A-Za-z가-힣]/g, "")
    .toLowerCase();
}

function comparableBaseName(value = "") {
  return normalizeName(value).replace(/(?:본점|직영점)$/u, "");
}

function addressTokens(value = "") {
  return new Set(
    normalizeAdministrativeNames(stripNaverHtml(value))
      .replace(/\([^)]*\)/g, " ")
      .replace(/\s+(?:지하\s*)?\d+(?:\s*,\s*\d+)?\s*층.*$/u, "")
      .replace(/\s+\d+\s*호.*$/u, "")
      .split(/[^0-9A-Za-z가-힣]+/)
      .map((token) => token.trim().toLowerCase())
      .filter((token) => token.length >= 1),
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

function compactAddress(value = "") {
  return normalizeAdministrativeNames(stripNaverHtml(value))
    .replace(/\([^)]*\)/g, "")
    .replace(/[^0-9A-Za-z가-힣]/g, "")
    .toLowerCase();
}

function nameMatchScore(requested: string, found: string) {
  const requestedName = normalizeName(requested);
  const foundName = normalizeName(found);
  if (!requestedName || !foundName) return 0;
  if (requestedName === foundName) return 1;

  const requestedBase = comparableBaseName(requested);
  const foundBase = comparableBaseName(found);
  if (requestedBase && requestedBase === foundBase) return 0.96;

  const shorter = Math.min(requestedName.length, foundName.length);
  const longer = Math.max(requestedName.length, foundName.length);
  if (
    shorter >= 4 &&
    shorter / longer >= 0.65 &&
    (requestedName.includes(foundName) || foundName.includes(requestedName))
  ) {
    return 0.82;
  }
  return 0;
}

function addressMatchScore(requested: string, found: string) {
  const requestedCompact = compactAddress(requested);
  const foundCompact = compactAddress(found);
  if (!requestedCompact || !foundCompact) return 0;
  if (
    requestedCompact === foundCompact ||
    requestedCompact.includes(foundCompact) ||
    foundCompact.includes(requestedCompact)
  ) {
    return 1;
  }
  const requestedTokens = addressTokens(requested);
  const foundTokens = addressTokens(found);
  const requestedNumbers = new Set(
    [...requestedTokens].filter((token) => /^\d+(?:-\d+)?$/.test(token)),
  );
  const foundNumbers = new Set(
    [...foundTokens].filter((token) => /^\d+(?:-\d+)?$/.test(token)),
  );
  if (
    requestedNumbers.size > 0 &&
    foundNumbers.size > 0 &&
    ![...requestedNumbers].some((number) => foundNumbers.has(number))
  ) {
    return 0;
  }
  return overlapScore(requestedTokens, foundTokens);
}

export function scoreNaverPlaceMatch(
  name: string,
  address: string,
  item: NaverLocalItem,
) {
  const foundName = stripNaverHtml(item.title);
  const foundAddresses = [
    stripNaverHtml(item.roadAddress),
    stripNaverHtml(item.address),
  ].filter(Boolean);
  const nameScore = nameMatchScore(name, foundName);
  const addressScore = Math.max(
    0,
    ...foundAddresses.map((candidate) => addressMatchScore(address, candidate)),
  );
  if (!nameScore || addressScore < MIN_ADDRESS_SCORE) return 0;
  return nameScore * 0.65 + addressScore * 0.35;
}

function naverCoordinates(item: NaverLocalItem) {
  const rawLongitude = Number(item.mapx);
  const rawLatitude = Number(item.mapy);
  if (!Number.isFinite(rawLongitude) || !Number.isFinite(rawLatitude)) return null;

  const longitude = rawLongitude > 1_000_000 ? rawLongitude / 10_000_000 : rawLongitude;
  const latitude = rawLatitude > 1_000_000 ? rawLatitude / 10_000_000 : rawLatitude;
  if (longitude < 124 || longitude > 132 || latitude < 32 || latitude > 40) return null;
  return { latitude, longitude };
}

function searchAddress(value: string) {
  return stripNaverHtml(value)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+(?:지하\s*)?\d+(?:\s*,\s*\d+)?\s*층.*$/u, "")
    .replace(/\s+\d+\s*호.*$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function locality(value: string) {
  return normalizeAdministrativeNames(stripNaverHtml(value))
    .split(/\s+/)
    .slice(0, 3)
    .join(" ");
}

async function searchNaver(
  query: string,
  clientId: string,
  clientSecret: string,
) {
  const url = new URL(NAVER_LOCAL_SEARCH_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("display", "5");
  url.searchParams.set("sort", "random");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new NaverPlaceVerificationError(
        `NAVER_LOCAL_${response.status}`,
        response.status,
      );
    }
    const payload = (await response.json()) as { items?: NaverLocalItem[] };
    return payload.items ?? [];
  } catch (error) {
    if (error instanceof NaverPlaceVerificationError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new NaverPlaceVerificationError("NAVER_LOCAL_TIMEOUT");
    }
    throw new NaverPlaceVerificationError("NAVER_LOCAL_UNAVAILABLE");
  } finally {
    clearTimeout(timeout);
  }
}

async function findNaverMatch(
  name: string,
  address: string,
  clientId: string,
  clientSecret: string,
) {
  const cacheKey = `${normalizeName(name)}|${compactAddress(address)}`;
  const cached = matchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.match;
  if (cached) matchCache.delete(cacheKey);

  const queries = Array.from(
    new Set([
      `${name} ${searchAddress(address)}`.trim(),
      `${name} ${locality(address)}`.trim(),
    ]),
  );

  let match: VerifiedMatch | null = null;
  for (const query of queries) {
    const items = await searchNaver(query, clientId, clientSecret);
    const ranked = items
      .map((item) => ({ item, score: scoreNaverPlaceMatch(name, address, item) }))
      .filter((candidate) => candidate.score >= MATCH_THRESHOLD)
      .sort((left, right) => right.score - left.score);
    const best = ranked[0];
    if (!best) continue;

    const point = naverCoordinates(best.item);
    match = {
      name: stripNaverHtml(best.item.title),
      address:
        stripNaverHtml(best.item.roadAddress) || stripNaverHtml(best.item.address),
      category: stripNaverHtml(best.item.category),
      confidence: Number(best.score.toFixed(2)),
      latitude: point?.latitude ?? null,
      longitude: point?.longitude ?? null,
    };
    break;
  }

  matchCache.set(cacheKey, {
    match,
    expiresAt:
      Date.now() + (match ? POSITIVE_CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS),
  });
  return match;
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (nextIndex < values.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(values[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

export async function verifyTourPlacesWithNaver<T extends TourPlaceForVerification>(
  places: T[],
  credentials: { clientId: string; clientSecret: string },
) {
  const checked = await mapWithConcurrency(
    places,
    VERIFY_CONCURRENCY,
    async (place): Promise<NaverVerifiedPlace<T> | null> => {
      const name = place.name.trim();
      const address = place.address?.trim() ?? "";
      if (!name || !address) return null;

      const match = await findNaverMatch(
        name,
        address,
        credentials.clientId,
        credentials.clientSecret,
      );
      if (!match) return null;

      return {
        ...place,
        naverVerified: true,
        naverName: match.name,
        naverAddress: match.address,
        naverCategory: match.category,
        naverMapUrl: `https://map.naver.com/p/search/${encodeURIComponent(
          `${match.name} ${match.address}`,
        )}`,
        naverMatchConfidence: match.confidence,
        naverLatitude: match.latitude,
        naverLongitude: match.longitude,
      };
    },
  );
  return checked.filter(
    (place): place is NaverVerifiedPlace<T> => place !== null,
  );
}
