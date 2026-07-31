import { NextRequest, NextResponse } from "next/server";

type TourPlace = {
  id?: string | number;
  contentTypeId?: string | number;
  name?: string;
  title?: string;
  category?: string;
  address?: string | null;
  region?: string;
  city?: string | null;
  latitude?: number | string;
  longitude?: number | string;
};

type Candidate = {
  id: string;
  name: string;
  category: string;
  address: string;
  description: string;
  mapUrl: string;
  reservationUrl: string;
  score: number;
  reason: string;
  source: "한국관광공사 TourAPI";
};

type ScoredCandidate = Candidate & {
  latitude: number | null;
  longitude: number | null;
};

type CourseBundle = {
  id: string;
  region: string;
  title: string;
  duration: string;
  items: Candidate[];
};

const NATIONWIDE_REGIONS = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
] as const;

const NATIONWIDE_REGION_GROUPS = [
  ["서울", "인천", "경기"],
  ["강원", "대전", "세종", "충북", "충남"],
  ["광주", "전북", "전남", "제주"],
  ["부산", "대구", "울산", "경북", "경남"],
] as const;

const NATIONWIDE_COURSE_COUNT = NATIONWIDE_REGION_GROUPS.length;

function tourCategory(value: string) {
  return value === "맛집" ? "음식" : value;
}

function serviceUrl(path: string) {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  if (!projectUrl) throw new Error("추천 데이터 서버가 설정되지 않았습니다.");
  return `${projectUrl}/functions/v1/kopick-api${path}`;
}

async function fetchTourSubregions(region: string) {
  const query = new URLSearchParams({ mode: "subregions", region });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (appUrl) {
    const appResponse = await fetch(`${appUrl}/api/tour/places?${query}`, {
      next: { revalidate: 86_400 },
    }).catch(() => null);
    if (appResponse?.ok) {
      const appPayload = await appResponse.json().catch(() => null) as {
        subregions?: Array<{ code?: string; name?: string }>;
      } | null;
      if (Array.isArray(appPayload?.subregions) && appPayload.subregions.length > 0) {
        return appPayload.subregions;
      }
    }
  }

  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const response = await fetch(serviceUrl(`/api/public/tour/places?${query}`), {
    headers: publishableKey ? { apikey: publishableKey } : undefined,
    next: { revalidate: 86_400 },
  });
  const payload = await response.json().catch(() => null) as {
    subregions?: Array<{ code?: string; name?: string }>;
  } | null;
  if (!response.ok) return [];
  return Array.isArray(payload?.subregions) ? payload.subregions : [];
}

async function fetchTourPlaces(region: string, category: string, pageSize: number, district = "전체") {
  const query = new URLSearchParams({
    region,
    category,
    page: "1",
    pageSize: String(Math.max(1, Math.min(30, pageSize))),
  });
  if (district && district !== "전체") {
    const subregions = await fetchTourSubregions(region);
    const subregion = subregions.find((item) => item.name?.trim() === district.trim());
    if (subregion?.code) query.set("sigunguCode", subregion.code);
  }
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const response = await fetch(serviceUrl(`/api/public/tour/places?${query}`), {
    headers: publishableKey ? { apikey: publishableKey } : undefined,
    next: { revalidate: 600 },
  });
  const payload = await response.json().catch(() => null) as {
    places?: TourPlace[];
    error?: string;
  } | null;
  if (!response.ok) throw new Error(payload?.error || "TourAPI 장소 조회에 실패했습니다.");
  return Array.isArray(payload?.places) ? payload.places : [];
}

async function loadCandidatePool(scope: string, region: string, category: string, district = "전체") {
  if (scope !== "전국" && region !== "전국") {
    const districtPlaces = await fetchTourPlaces(region, category, 30, district);
    if (district === "전체" || districtPlaces.length >= 4) return districtPlaces;

    const regionPlaces = await fetchTourPlaces(region, category, 30);
    const seen = new Set(districtPlaces.map((place) => String(place.id ?? `${place.name}|${place.address}`)));
    return [
      ...districtPlaces,
      ...regionPlaces.filter((place) => {
        const key = String(place.id ?? `${place.name}|${place.address}`);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    ];
  }

  const groups: TourPlace[][] = [];
  for (let index = 0; index < NATIONWIDE_REGIONS.length; index += 4) {
    const batch = NATIONWIDE_REGIONS.slice(index, index + 4);
    const settled = await Promise.allSettled(
      batch.map((regionName) => fetchTourPlaces(regionName, category, 3)),
    );
    for (const result of settled) {
      if (result.status === "fulfilled") groups.push(result.value);
    }
  }
  return groups.flat();
}

function scorePlace(place: TourPlace, index: number, params: URLSearchParams) {
  const text = `${place.name ?? place.title ?? ""} ${place.category ?? ""} ${place.address ?? ""}`;
  const relationship = params.get("relationship") || "개인";
  const mood = params.get("mood") || "조용한";
  const category = tourCategory(params.get("category") || "카페");
  const district = params.get("district") || "전체";
  let score = 72 - Math.min(index, 8);

  const terms: Record<string, string[]> = {
    개인: ["혼밥", "산책", "공원", "카페"],
    커플: ["데이트", "전망", "공원", "카페"],
    친구: ["체험", "축제", "테마", "맛집"],
    가족: ["가족", "공원", "박물관", "체험"],
    조용한: ["산책", "정원", "숲", "한옥", "박물관"],
    활기찬: ["축제", "시장", "체험", "테마"],
    감성적인: ["전망", "한옥", "미술관", "해변"],
    "뷰가 좋은": ["전망", "해변", "바다", "산", "호수"],
  };

  if (text.includes(category)) score += 10;
  if (district !== "전체" && (place.city === district || text.includes(district))) score += 14;
  if ((terms[relationship] ?? []).some((term) => text.includes(term))) score += 7;
  if ((terms[mood] ?? []).some((term) => text.includes(term))) score += 6;
  if (params.get("indoor") === "실내" && /(카페|식당|박물관|미술관|전시)/.test(text)) {
    score += 5;
  }
  const weatherIndoor = params.get("weatherIndoor") === "true";
  if (weatherIndoor && /(카페|식당|박물관|미술관|전시|실내)/.test(text)) score += 9;
  if (!weatherIndoor && /(공원|해변|산|축제|정원|수목원|산책)/.test(text)) score += 6;
  return Math.max(65, Math.min(96, score));
}

function reasonFor(score: number, params: URLSearchParams) {
  const relationship = params.get("relationship") || "개인";
  const mood = params.get("mood") || "조용한";
  const weather = params.get("weatherCondition")?.trim();
  const weatherReason = weather ? ` ${weather} 예보도 반영했어요.` : "";
  if (score >= 90) return `${relationship} 일정과 ${mood} 분위기 조건에 특히 잘 맞는 장소예요.${weatherReason}`;
  if (score >= 82) return `선택한 지역·카테고리와 취향 조건이 고르게 맞아요.${weatherReason}`;
  return `한국관광공사 장소 중 현재 선택 조건에 가까운 후보예요.${weatherReason}`;
}

function toCandidate(place: TourPlace, index: number, params: URLSearchParams): ScoredCandidate | null {
  const category = tourCategory(params.get("category") || "카페");
  const name = String(place.name ?? place.title ?? "").trim();
  const address = String(place.address ?? "").trim();
  if (!name || !address) return null;
  const id = String(place.id ?? `${name}|${address}`);
  const score = scorePlace(place, index, params);
  const mapQuery = encodeURIComponent(`${name} ${address}`);
  const latitudeValue = String(place.latitude ?? "").trim();
  const longitudeValue = String(place.longitude ?? "").trim();
  const latitude = latitudeValue ? Number(latitudeValue) : Number.NaN;
  const longitude = longitudeValue ? Number(longitudeValue) : Number.NaN;
  return {
    id,
    name,
    category: String(place.category ?? category),
    address,
    description: "한국관광공사 TourAPI 제공 장소 정보",
    mapUrl: `https://map.naver.com/p/search/${mapQuery}`,
    reservationUrl: "",
    score,
    reason: reasonFor(score, params),
    source: "한국관광공사 TourAPI",
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
  };
}

function toPublicCandidate(candidate: ScoredCandidate): Candidate {
  return {
    id: candidate.id,
    name: candidate.name,
    category: candidate.category,
    address: candidate.address,
    description: candidate.description,
    mapUrl: candidate.mapUrl,
    reservationUrl: candidate.reservationUrl,
    score: candidate.score,
    reason: candidate.reason,
    source: candidate.source,
  };
}

function distanceKm(a: ScoredCandidate, b: ScoredCandidate) {
  if (a.latitude === null || a.longitude === null || b.latitude === null || b.longitude === null) {
    return null;
  }
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latDistance = radians(b.latitude - a.latitude);
  const lonDistance = radians(b.longitude - a.longitude);
  const value = Math.sin(latDistance / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude))
    * Math.sin(lonDistance / 2) ** 2;
  const normalized = Math.max(0, Math.min(1, value));
  return 6371 * 2 * Math.atan2(Math.sqrt(normalized), Math.sqrt(1 - normalized));
}

function courseCategories(duration: string, preferred: string, weatherIndoor: boolean) {
  const base = weatherIndoor
    ? ["관광지", "음식", "카페", "축제"]
    : ["관광지", "음식", "축제", "카페"];
  const distinct = [preferred, ...base.filter((category) => category !== preferred)];

  if (duration === "2시간") return distinct.slice(0, 3);
  if (duration === "하루") {
    return [
      ...distinct,
      weatherIndoor ? "관광지" : "축제",
      weatherIndoor ? "카페" : "관광지",
    ];
  }
  return distinct;
}

function stableHash(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
}

function nationwideGroupOrders(params: URLSearchParams) {
  const seed = stableHash([
    params.get("date"),
    params.get("relationship"),
    params.get("category"),
    params.get("mood"),
    params.get("variation") || "0",
  ].join("|"));
  return NATIONWIDE_REGION_GROUPS.map((group, groupIndex) => {
    const offset = (seed + groupIndex * 3) % group.length;
    return [...group.slice(offset), ...group.slice(0, offset)];
  });
}

async function buildCourse(scope: string, region: string, params: URLSearchParams) {
  const preferred = tourCategory(params.get("category") || "카페");
  const duration = params.get("duration") || "반나절";
  const categories = courseCategories(duration, preferred, params.get("weatherIndoor") === "true");
  const uniqueCategories = [...new Set(categories)];
  const district = params.get("district") || "전체";
  const pools = new Map<string, ScoredCandidate[]>();

  const loaded = await Promise.allSettled(uniqueCategories.map(async (category) => {
    const categoryParams = new URLSearchParams(params);
    categoryParams.set("category", category);
    const raw = await loadCandidatePool(scope, region, category, district);
    const seen = new Set<string>();
    const candidates = raw.flatMap((place, index) => {
      const candidate = toCandidate(place, index, categoryParams);
      if (!candidate) return [];
      const key = `${candidate.name}|${candidate.address}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [candidate];
    });
    candidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ko"));
    return { category, candidates };
  }));

  for (const result of loaded) {
    if (result.status === "fulfilled") pools.set(result.value.category, result.value.candidates);
  }

  const selected: ScoredCandidate[] = [];
  const used = new Set<string>();
  for (const category of categories) {
    const available = (pools.get(category) ?? []).filter((candidate) => !used.has(candidate.id));
    const previous = selected.at(-1);
    const ranked = available.map((candidate) => {
      const distance = previous ? distanceKm(previous, candidate) : null;
      const nearbyBonus = previous && candidate.address.split(" ").slice(0, 2).join(" ")
        === previous.address.split(" ").slice(0, 2).join(" ") ? 8 : 0;
      const distancePenalty = distance === null ? 0 : Math.min(18, distance / 3);
      return { candidate, courseScore: candidate.score + nearbyBonus - distancePenalty };
    }).sort((a, b) => b.courseScore - a.courseScore);
    const next = ranked[0]?.candidate;
    if (!next) continue;
    used.add(next.id);
    selected.push(next);
  }

  if (selected.length < categories.length) {
    const fallbackPool = [...pools.values()]
      .flat()
      .filter((candidate) => !used.has(candidate.id));

    while (selected.length < categories.length && fallbackPool.length > 0) {
      const previous = selected.at(-1);
      const ranked = fallbackPool.map((candidate) => {
        const distance = previous ? distanceKm(previous, candidate) : null;
        const nearbyBonus = previous && candidate.address.split(" ").slice(0, 2).join(" ")
          === previous.address.split(" ").slice(0, 2).join(" ") ? 8 : 0;
        const distancePenalty = distance === null ? 0 : Math.min(18, distance / 3);
        return { candidate, courseScore: candidate.score + nearbyBonus - distancePenalty };
      }).sort((a, b) => b.courseScore - a.courseScore);
      const next = ranked[0]?.candidate;
      if (!next) break;
      used.add(next.id);
      selected.push(next);
      const nextIndex = fallbackPool.findIndex((candidate) => candidate.id === next.id);
      fallbackPool.splice(nextIndex, 1);
    }
  }

  return selected;
}

function toCourseBundle(region: string, params: URLSearchParams, course: ScoredCandidate[]): CourseBundle {
  const duration = params.get("duration") || "반나절";
  const relationship = params.get("relationship") || "개인";
  const district = params.get("district") || "전체";
  const location = district === "전체" ? region : `${region} ${district}`;
  return {
    id: `${location}-${duration}-${course.map((item) => item.id).join("-")}`,
    region: location,
    title: `${location} ${relationship} ${duration} 코스`,
    duration,
    items: course.map(toPublicCandidate),
  };
}

async function buildNationwideCourses(params: URLSearchParams) {
  const groupOrders = nationwideGroupOrders(params);
  const courses = new Array<CourseBundle | null>(NATIONWIDE_COURSE_COUNT).fill(null);
  const maximumRounds = 3;

  for (let round = 0; round < maximumRounds && courses.some((course) => course === null); round += 1) {
    const attempts = groupOrders.flatMap((group, groupIndex) => {
      if (courses[groupIndex]) return [];
      const region = group[round];
      return region ? [{ groupIndex, region }] : [];
    });
    const settled = await Promise.allSettled(attempts.map(async ({ groupIndex, region }) => {
      const courseParams = new URLSearchParams(params);
      courseParams.set("district", "전체");
      const course = await buildCourse("내 지역", region, courseParams);
      return { groupIndex, bundle: course.length >= 2 ? toCourseBundle(region, courseParams, course) : null };
    }));
    for (const result of settled) {
      if (result.status === "fulfilled" && result.value.bundle) {
        courses[result.value.groupIndex] = result.value.bundle;
      }
    }
  }

  return courses.filter((course): course is CourseBundle => course !== null);
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const requestedCount = Math.min(
      24,
      Math.max(3, Number.parseInt(params.get("resultCount") || "12", 10) || 12),
    );
    const scope = params.get("scope") || "내 지역";
    const region = params.get("region") || "서울";
    const category = tourCategory(params.get("category") || "카페");
    const mode = params.get("mode") === "course" ? "course" : "single";

    if (mode === "course") {
      if (scope === "전국" || region === "전국") {
        const courses = await buildNationwideCourses(params);
        if (courses.length === 0) {
          return NextResponse.json(
            { error: "전국에서 코스로 묶을 장소를 찾지 못했습니다. 잠시 후 다시 시도해 주세요." },
            { status: 404 },
          );
        }
        return NextResponse.json(
          {
            scope: "전국",
            mode,
            totalCount: courses.reduce((total, course) => total + course.items.length, 0),
            items: courses.flatMap((course) => course.items),
            courses,
            availableRegions: NATIONWIDE_REGIONS,
            course: {
              date: params.get("date") || null,
              duration: params.get("duration") || "반나절",
              weatherCondition: null,
              indoorRecommended: params.get("weatherIndoor") === "true",
            },
            source: "한국관광공사 TourAPI",
            attributionUrl: "https://api.visitkorea.or.kr/",
          },
        );
      }
      const course = await buildCourse(scope, region, params);
      if (course.length < 2) {
        return NextResponse.json(
          { error: "코스로 묶을 장소가 부족합니다. 지역이나 선호 카테고리를 바꿔보세요." },
          { status: 404 },
        );
      }
      return NextResponse.json({
        scope,
        mode,
        totalCount: course.length,
        items: course.map(toPublicCandidate),
        courses: [toCourseBundle(region, params, course)],
        course: {
          date: params.get("date") || null,
          duration: params.get("duration") || "반나절",
          weatherCondition: params.get("weatherCondition") || null,
          indoorRecommended: params.get("weatherIndoor") === "true",
        },
        source: "한국관광공사 TourAPI",
        attributionUrl: "https://api.visitkorea.or.kr/",
      });
    }

    const rawPlaces = await loadCandidatePool(scope, region, category, params.get("district") || "전체");
    const seen = new Set<string>();

    const candidates = rawPlaces.flatMap((place, index): Candidate[] => {
      const candidate = toCandidate(place, index, params);
      if (!candidate) return [];
      const dedupeKey = `${candidate.name}|${candidate.address}`;
      if (seen.has(dedupeKey)) return [];
      seen.add(dedupeKey);
      return [toPublicCandidate(candidate)];
    });

    candidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ko"));
    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "현재 조건에서 확인된 TourAPI 장소가 없습니다. 지역이나 카테고리를 바꿔보세요." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      scope,
      totalCount: candidates.length,
      items: candidates.slice(0, requestedCount),
      source: "한국관광공사 TourAPI",
      attributionUrl: "https://api.visitkorea.or.kr/",
    });
  } catch (error) {
    console.error("recommend API error", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "추천 장소를 불러오는 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
