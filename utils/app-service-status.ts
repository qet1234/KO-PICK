export type AppServiceMode = "operational" | "partial" | "maintenance";

export const appServiceFeatureOptions = [
  "홈 추천",
  "장소 찾기",
  "코스 설정",
  "직장인 회식",
  "빠른 점심",
  "실시간 날씨",
  "네이버 지도",
  "로그인·계정",
  "공유 기능",
] as const;

export const operationalFeatureDefinitions = [
  { key: "place_search", label: "장소 찾기" },
  { key: "recommendations", label: "추천·코스" },
  { key: "office_dining", label: "직장인 식사" },
  { key: "saved_places", label: "찜·최근 장소" },
  { key: "shared_poll", label: "함께 고르기" },
  { key: "reservations", label: "예약 연결" },
  { key: "weather", label: "실시간 날씨" },
  { key: "navigation", label: "지도·길찾기" },
] as const;

export type OperationalFeatureKey = (typeof operationalFeatureDefinitions)[number]["key"];
export type OperationalFeatureFlags = Record<OperationalFeatureKey, boolean>;

export const defaultOperationalFeatureFlags: OperationalFeatureFlags = Object.fromEntries(
  operationalFeatureDefinitions.map(({ key }) => [key, true]),
) as OperationalFeatureFlags;

export type AppServiceStatusRecord = {
  affectedFeatures: string[];
  androidForceUpdate: boolean;
  androidMinVersion: string;
  androidStoreUrl: string | null;
  endsAt: string | null;
  featureFlags: OperationalFeatureFlags;
  iosForceUpdate: boolean;
  iosMinVersion: string;
  iosStoreUrl: string | null;
  message: string;
  mode: AppServiceMode;
  startsAt: string | null;
  title: string;
  updatedAt: string;
};

export const defaultAppServiceStatus: AppServiceStatusRecord = {
  affectedFeatures: [],
  androidForceUpdate: false,
  androidMinVersion: "1.0.0",
  androidStoreUrl: null,
  endsAt: null,
  featureFlags: defaultOperationalFeatureFlags,
  iosForceUpdate: false,
  iosMinVersion: "1.0.0",
  iosStoreUrl: null,
  message: "더 안정적인 서비스 제공을 위해 시스템 점검을 진행하고 있습니다.",
  mode: "operational",
  startsAt: null,
  title: "서비스 점검 안내",
  updatedAt: new Date(0).toISOString(),
};

function string(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeAppServiceStatus(value: unknown): AppServiceStatusRecord {
  if (!value || typeof value !== "object") return defaultAppServiceStatus;
  const row = value as Record<string, unknown>;
  const rawMode = row.mode;
  const mode: AppServiceMode = rawMode === "maintenance" || rawMode === "partial"
    ? rawMode
    : "operational";
  const rawFeatureFlags = row.feature_flags && typeof row.feature_flags === "object"
    ? row.feature_flags as Record<string, unknown>
    : {};
  const featureFlags = Object.fromEntries(
    operationalFeatureDefinitions.map(({ key }) => [key, rawFeatureFlags[key] !== false]),
  ) as OperationalFeatureFlags;

  return {
    affectedFeatures: Array.isArray(row.affected_features)
      ? row.affected_features.filter((item): item is string => typeof item === "string")
      : [],
    androidForceUpdate: row.android_force_update === true,
    androidMinVersion: string(row.android_min_version, "1.0.0"),
    androidStoreUrl: nullableString(row.android_store_url),
    endsAt: nullableString(row.ends_at),
    featureFlags,
    iosForceUpdate: row.ios_force_update === true,
    iosMinVersion: string(row.ios_min_version, "1.0.0"),
    iosStoreUrl: nullableString(row.ios_store_url),
    message: string(row.message, defaultAppServiceStatus.message),
    mode,
    startsAt: nullableString(row.starts_at),
    title: string(row.title, defaultAppServiceStatus.title),
    updatedAt: string(row.updated_at, defaultAppServiceStatus.updatedAt),
  };
}

function versionParts(value: string) {
  return value.split(".").slice(0, 3).map((part) => {
    const parsed = Number.parseInt(part.replace(/\D.*$/, ""), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
}

export function isVersionLower(currentVersion: string, minimumVersion: string) {
  const current = versionParts(currentVersion);
  const minimum = versionParts(minimumVersion);
  for (let index = 0; index < 3; index += 1) {
    const currentPart = current[index] ?? 0;
    const minimumPart = minimum[index] ?? 0;
    if (currentPart !== minimumPart) return currentPart < minimumPart;
  }
  return false;
}

export function effectiveServiceMode(status: AppServiceStatusRecord, now = new Date()) {
  if (status.mode === "operational") return status.mode;
  const nowTime = now.getTime();
  const startsAt = status.startsAt ? new Date(status.startsAt).getTime() : null;
  const endsAt = status.endsAt ? new Date(status.endsAt).getTime() : null;
  if (startsAt !== null && Number.isFinite(startsAt) && nowTime < startsAt) return "operational";
  if (endsAt !== null && Number.isFinite(endsAt) && nowTime > endsAt) return "operational";
  return status.mode;
}
