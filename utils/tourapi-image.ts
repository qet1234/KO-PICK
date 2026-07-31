const TOUR_API_IMAGE_ENDPOINT =
  "https://apis.data.go.kr/B551011/KorService2/detailImage2";

export type TourImageCopyrightCode = "Type1" | "Type3";

export type VerifiedTourImage = {
  imageUrl: string;
  thumbnailUrl: string | null;
  imageName: string | null;
  copyrightCode: TourImageCopyrightCode;
  licenseLabel: "공공누리 제1유형" | "공공누리 제3유형";
  attribution: string;
  modificationAllowed: boolean;
  licenseUrl: "https://www.kogl.or.kr/info/license.do";
  sourceUrl: "https://www.data.go.kr/data/15101578/openapi.do";
};

type TourImageRequest = {
  contentId: string;
  preferredUrl?: string | null;
};

type TourImageItem = {
  originimgurl?: string;
  smallimageurl?: string;
  imgname?: string;
  cpyrhtDivCd?: string;
};

type TourImagePayload = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: { item?: TourImageItem | TourImageItem[] } };
  };
};

function decodeServiceKey(rawKey: string) {
  if (!rawKey.includes("%")) return rawKey;
  try {
    return decodeURIComponent(rawKey);
  } catch {
    return rawKey;
  }
}

function normalizeCopyrightCode(
  value: string | undefined
): TourImageCopyrightCode | null {
  const normalized = (value ?? "").replace(/[\s_-]/g, "").toLowerCase();
  if (normalized === "type1" || normalized === "1") return "Type1";
  if (normalized === "type3" || normalized === "3") return "Type3";
  return null;
}

function normalizeVisitKoreaImageUrl(value: string | undefined) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim().replace(/^http:/, "https:"));
    if (url.protocol !== "https:") return null;
    const hostname = url.hostname.toLowerCase();
    if (
      hostname !== "visitkorea.or.kr" &&
      !hostname.endsWith(".visitkorea.or.kr")
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function comparableImageUrl(value: string | null | undefined) {
  const normalized = normalizeVisitKoreaImageUrl(value ?? undefined);
  if (!normalized) return "";
  const url = new URL(normalized);
  return `${url.hostname}${url.pathname}`.toLowerCase();
}

function itemsFrom(payload: TourImagePayload) {
  const item = payload.response?.body?.items?.item;
  return Array.isArray(item) ? item : item ? [item] : [];
}

function toVerifiedImage(item: TourImageItem): VerifiedTourImage | null {
  const copyrightCode = normalizeCopyrightCode(item.cpyrhtDivCd);
  const imageUrl = normalizeVisitKoreaImageUrl(item.originimgurl);
  if (!copyrightCode || !imageUrl) return null;

  const licenseLabel =
    copyrightCode === "Type1" ? "공공누리 제1유형" : "공공누리 제3유형";

  return {
    imageUrl,
    thumbnailUrl: normalizeVisitKoreaImageUrl(item.smallimageurl),
    imageName: item.imgname?.trim() || null,
    copyrightCode,
    licenseLabel,
    attribution: `사진: 한국관광공사 TourAPI · ${licenseLabel}`,
    modificationAllowed: copyrightCode === "Type1",
    licenseUrl: "https://www.kogl.or.kr/info/license.do",
    sourceUrl: "https://www.data.go.kr/data/15101578/openapi.do",
  };
}

async function loadVerifiedTourImage(
  input: TourImageRequest,
  rawServiceKey: string,
  mobileApp: string
) {
  const params = new URLSearchParams({
    serviceKey: decodeServiceKey(rawServiceKey.trim()),
    MobileOS: "ETC",
    MobileApp: mobileApp,
    _type: "json",
    contentId: input.contentId,
    imageYN: "Y",
    subImageYN: "Y",
    pageNo: "1",
    numOfRows: "100",
  });

  try {
    const response = await fetch(`${TOUR_API_IMAGE_ENDPOINT}?${params}`, {
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as TourImagePayload;
    if (payload.response?.header?.resultCode !== "0000") return null;

    const verified = itemsFrom(payload).flatMap((item) => {
      const image = toVerifiedImage(item);
      return image ? [image] : [];
    });
    if (verified.length === 0) return null;

    const preferred = comparableImageUrl(input.preferredUrl);
    return (
      verified.find((image) => comparableImageUrl(image.imageUrl) === preferred) ??
      verified[0]
    );
  } catch {
    return null;
  }
}

export async function loadVerifiedTourImages(
  requests: TourImageRequest[],
  options: {
    serviceKey?: string | null;
    mobileApp?: string | null;
    concurrency?: number;
  } = {}
) {
  const rawServiceKey =
    options.serviceKey?.trim() ||
    process.env.TOUR_API_SERVICE_KEY?.trim() ||
    process.env.TOUR_API_KEY?.trim() ||
    "";
  if (!rawServiceKey) return new Map<string, VerifiedTourImage>();

  const mobileApp = options.mobileApp?.trim() ||
    process.env.TOUR_API_MOBILE_APP?.trim() ||
    "KoreaPick";
  const unique = [...new Map(
    requests
      .filter((request) => request.contentId.trim())
      .map((request) => [request.contentId.trim(), request])
  ).values()];
  const concurrency = Math.max(1, Math.min(6, options.concurrency ?? 4));
  const images = new Map<string, VerifiedTourImage>();

  for (let index = 0; index < unique.length; index += concurrency) {
    const batch = unique.slice(index, index + concurrency);
    const results = await Promise.all(
      batch.map(async (request) => ({
        contentId: request.contentId,
        image: await loadVerifiedTourImage(request, rawServiceKey, mobileApp),
      }))
    );
    results.forEach(({ contentId, image }) => {
      if (image) images.set(contentId, image);
    });
  }

  return images;
}
