import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/admin";
import {
  defaultAppServiceStatus,
  effectiveServiceMode,
  isVersionLower,
  normalizeAppServiceStatus,
} from "@/utils/app-service-status";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const currentVersion = requestUrl.searchParams.get("version")?.trim() || "0.0.0";
  let status = defaultAppServiceStatus;

  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("app_service_status")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("앱 서비스 상태 조회 오류:", error.message);
    } else if (data) {
      status = normalizeAppServiceStatus(data);
    }
  } catch (error) {
    // 상태 서버 장애만으로 정상 이용자를 잠그지 않도록 정상 운영으로 통과합니다.
    console.error("앱 서비스 상태 설정 오류:", error);
  }

  const minimumVersion = status.androidMinVersion;
  const forceUpdate = status.androidForceUpdate;
  const storeUrl = status.androidStoreUrl;

  return NextResponse.json({
    affectedFeatures: status.affectedFeatures,
    endsAt: status.endsAt,
    featureFlags: status.featureFlags,
    message: status.message,
    mode: effectiveServiceMode(status),
    startsAt: status.startsAt,
    title: status.title,
    update: {
      minimumVersion,
      required: forceUpdate || isVersionLower(currentVersion, minimumVersion),
      url: storeUrl,
    },
    updatedAt: status.updatedAt,
  }, { headers: noStoreHeaders });
}
