import {
  verifiedTourImageFromList,
  type VerifiedTourImage,
} from "@/utils/tourapi-image";

type DiningPlace = {
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
};

type TourApiRestaurant = {
  contentid?: string;
  title?: string;
  addr1?: string;
  addr2?: string;
  mapx?: string;
  mapy?: string;
  firstimage?: string;
  firstimage2?: string;
  cpyrhtDivCd?: string;
};

type TourApiPayload = {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: {
      items?: {
        item?: TourApiRestaurant | TourApiRestaurant[];
      };
    };
  };
};

export type TourRestaurantPhoto = {
  contentId: string;
  name: string;
  normalizedName: string;
  address: string;
  latitude: number;
  longitude: number;
  image: VerifiedTourImage;
};

const TOUR_API_RESTAURANT_ENDPOINT =
  "https://apis.data.go.kr/B551011/KorService2/areaBasedList2";

const regionCodes: Record<string, string> = {
  서울: "1",
  인천: "2",
  대전: "3",
  대구: "4",
  광주: "5",
  부산: "6",
  울산: "7",
  세종: "8",
  경기: "31",
  강원: "32",
  충북: "33",
  충남: "34",
  경북: "35",
  경남: "36",
  전북: "37",
  전남: "38",
  제주: "39",
};

function decodeServiceKey(rawKey: string) {
  if (!rawKey.includes("%")) return rawKey;
  try {
    return decodeURIComponent(rawKey);
  } catch {
    return rawKey;
  }
}

function itemsFrom(payload: TourApiPayload) {
  const item = payload.response?.body?.items?.item;
  return Array.isArray(item) ? item : item ? [item] : [];
}

function normalizeName(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^0-9a-z가-힣]/g, "");
}

function radians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceMeters(a: DiningPlace, b: TourRestaurantPhoto) {
  const earthRadius = 6_371_000;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const latitudeA = radians(a.latitude);
  const latitudeB = radians(b.latitude);
  const h =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function matchingPhoto(
  place: DiningPlace,
  catalog: TourRestaurantPhoto[]
) {
  const normalizedName = normalizeName(place.name);
  if (!normalizedName) return null;

  return catalog
    .flatMap((candidate) => {
      const exactName = candidate.normalizedName === normalizedName;
      const containedName =
        Math.min(candidate.normalizedName.length, normalizedName.length) >= 5 &&
        (candidate.normalizedName.includes(normalizedName) ||
          normalizedName.includes(candidate.normalizedName));
      if (!exactName && !containedName) return [];

      const distance = distanceMeters(place, candidate);
      if (exactName ? distance > 1_500 : distance > 300) return [];

      return [{
        candidate,
        score: (exactName ? 0 : 1) * 10_000 + distance,
      }];
    })
    .sort((a, b) => a.score - b.score)[0]?.candidate ?? null;
}

export async function loadTourRestaurantPhotoCatalog(region: string) {
  const rawServiceKey = (
    process.env.TOUR_API_SERVICE_KEY ??
    process.env.TOUR_API_KEY
  )?.trim();
  const areaCode = regionCodes[region];
  if (!rawServiceKey || !areaCode) return [] as TourRestaurantPhoto[];

  const params = new URLSearchParams({
    serviceKey: decodeServiceKey(rawServiceKey),
    MobileOS: "ETC",
    MobileApp: process.env.TOUR_API_MOBILE_APP?.trim() || "KoreaPick",
    _type: "json",
    areaCode,
    contentTypeId: "39",
    arrange: "Q",
    pageNo: "1",
    numOfRows: "1000",
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);

  try {
    const response = await fetch(
      `${TOUR_API_RESTAURANT_ENDPOINT}?${params.toString()}`,
      {
        next: { revalidate: 86_400 },
        signal: controller.signal,
      }
    );
    if (!response.ok) return [];

    const payload = (await response.json()) as TourApiPayload;
    if (payload.response?.header?.resultCode !== "0000") return [];

    return itemsFrom(payload).flatMap((item) => {
      const latitude = Number(item.mapy);
      const longitude = Number(item.mapx);
      const name = item.title?.trim() ?? "";
      const image = verifiedTourImageFromList({
        imageUrl: item.firstimage ?? null,
        thumbnailUrl: item.firstimage2 ?? null,
        copyrightCode: item.cpyrhtDivCd ?? null,
      });
      if (
        !item.contentid ||
        !name ||
        !image ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return [];
      }
      return [{
        contentId: item.contentid,
        name,
        normalizedName: normalizeName(name),
        address: [item.addr1, item.addr2].filter(Boolean).join(" "),
        latitude,
        longitude,
        image,
      }];
    });
  } catch (error) {
    console.warn("TourAPI 음식점 사진 조회 실패:", error);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export function attachTourRestaurantPhotos<T extends DiningPlace>(
  places: T[],
  catalog: TourRestaurantPhoto[]
) {
  return places.map((place) => {
    const match = matchingPhoto(place, catalog);
    const image = match?.image ?? null;
    return {
      ...place,
      imageUrl: image?.imageUrl ?? null,
      imageThumbnailUrl: image?.thumbnailUrl ?? null,
      imageCopyrightCode: image?.copyrightCode ?? null,
      imageLicenseLabel: image?.licenseLabel ?? null,
      imageAttribution: image?.attribution ?? null,
      imageModificationAllowed: image?.modificationAllowed ?? false,
      imageLicenseUrl: image?.licenseUrl ?? null,
      imageSourceUrl: image?.sourceUrl ?? null,
      imageContentId: match?.contentId ?? null,
      imageMatchedName: match?.name ?? null,
    };
  });
}
