export type WeatherLocationSuggestion = {
  id: string;
  name: string;
  label: string;
  region: string;
  district: string;
  latitude: number;
  longitude: number;
};

type NominatimResult = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string | undefined>;
};

const regionNames: Record<string, readonly string[]> = {
  서울: ["서울", "서울특별시"],
  부산: ["부산", "부산광역시"],
  대구: ["대구", "대구광역시"],
  인천: ["인천", "인천광역시"],
  광주: ["광주", "광주광역시"],
  대전: ["대전", "대전광역시"],
  울산: ["울산", "울산광역시"],
  세종: ["세종", "세종특별자치시"],
  경기: ["경기", "경기도"],
  강원: ["강원", "강원특별자치도"],
  충북: ["충북", "충청북도"],
  충남: ["충남", "충청남도"],
  전북: ["전북", "전북특별자치도", "전라북도"],
  전남: ["전남", "전라남도"],
  경북: ["경북", "경상북도"],
  경남: ["경남", "경상남도"],
  제주: ["제주", "제주특별자치도"],
};

const localityAddressKeys = [
  "legal",
  "quarter",
  "suburb",
  "neighbourhood",
  "village",
  "town",
  "hamlet",
  "municipality",
] as const;

let lastProviderRequestAt = 0;
let providerQueue = Promise.resolve();

function normalize(value: string) {
  return value.replace(/\s+/g, "").toLocaleLowerCase("ko-KR");
}

function validKoreaCoordinates(latitude: number, longitude: number) {
  return latitude >= 32 && latitude <= 39.8 && longitude >= 124 && longitude <= 132;
}

function selectedLocality(item: NominatimResult) {
  const directName = item.name?.trim() ?? "";
  if (/[읍면동리]$/.test(directName)) return directName;

  for (const key of localityAddressKeys) {
    const value = item.address?.[key]?.trim() ?? "";
    if (value && /[읍면동리]$/.test(value)) return value;
  }

  return directName;
}

async function waitForProviderSlot() {
  const previous = providerQueue;
  let release: () => void = () => {};
  providerQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  const remaining = 1_050 - (Date.now() - lastProviderRequestAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  lastProviderRequestAt = Date.now();
  release();
}

export async function searchWeatherLocations({
  region,
  district,
  query,
}: {
  region: string;
  district: string;
  query: string;
}): Promise<WeatherLocationSuggestion[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2 || trimmedQuery.length > 30) return [];

  const fullRegionName = regionNames[region]?.at(-1) ?? region;
  const queryParts = [trimmedQuery, district !== "전체" ? district : "", fullRegionName, "대한민국"]
    .filter(Boolean);
  const params = new URLSearchParams({
    q: queryParts.join(", "),
    format: "jsonv2",
    countrycodes: "kr",
    "accept-language": "ko",
    addressdetails: "1",
    layer: "address",
    featureType: "settlement",
    limit: "12",
  });
  const providerBaseUrl = process.env.WEATHER_GEOCODING_BASE_URL?.trim()
    || "https://nominatim.openstreetmap.org/search";

  await waitForProviderSlot();
  const response = await fetch(`${providerBaseUrl}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "ko-KR,ko;q=0.9",
      Referer: "https://koreapick.duckdns.org/",
      "User-Agent": "KO-PICK/1.0 weather-location-search (https://koreapick.duckdns.org)",
    },
    next: { revalidate: 86_400 },
  });
  if (!response.ok) throw new Error(`Weather geocoding API ${response.status}`);

  const payload = await response.json() as NominatimResult[];
  const districtKey = normalize(district);
  const regionKeys = (regionNames[region] ?? [region]).map(normalize);
  const suggestions: WeatherLocationSuggestion[] = [];
  const seen = new Set<string>();

  for (const item of Array.isArray(payload) ? payload : []) {
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !validKoreaCoordinates(latitude, longitude)) continue;

    const addressText = normalize([
      item.display_name,
      ...Object.values(item.address ?? {}),
    ].filter(Boolean).join(" "));
    if (!regionKeys.some((key) => addressText.includes(key))) continue;
    if (district !== "전체" && !addressText.includes(districtKey)) continue;

    const name = selectedLocality(item);
    if (!name || !/[읍면동리]$/.test(name)) continue;
    const dedupeKey = `${normalize(name)}:${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const labelParts = [name, district !== "전체" ? district : "", fullRegionName].filter(Boolean);
    suggestions.push({
      id: item.osm_type && item.osm_id ? `${item.osm_type}${item.osm_id}` : String(item.place_id ?? dedupeKey),
      name,
      label: labelParts.join(" · "),
      region,
      district,
      latitude,
      longitude,
    });
  }

  return suggestions.slice(0, 10);
}
