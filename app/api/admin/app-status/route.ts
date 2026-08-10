import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getAdminAccess } from "@/utils/admin";
import { normalizeAppServiceStatus, type AppServiceMode } from "@/utils/app-service-status";

const versionPattern = /^\d+\.\d+\.\d+$/;

function requiredText(value: unknown, maximum: number, label: string) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximum) {
    throw new Error(`${label}을(를) ${maximum}자 이내로 입력해 주세요.`);
  }
  return value.trim();
}

function nullableDate(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error(`${label} 형식이 올바르지 않습니다.`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} 형식이 올바르지 않습니다.`);
  return parsed.toISOString();
}

function version(value: unknown, label: string) {
  if (typeof value !== "string" || !versionPattern.test(value.trim())) {
    throw new Error(`${label}은(는) 1.0.0 형식으로 입력해 주세요.`);
  }
  return value.trim();
}

function nullableHttpsUrl(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > 500) throw new Error(`${label}이(가) 올바르지 않습니다.`);
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    throw new Error(`${label}은(는) https 주소로 입력해 주세요.`);
  }
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  }

  const access = await getAdminAccess();
  if (!access.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!access.authorized) return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const mode = body.mode;
    if (mode !== "operational" && mode !== "partial" && mode !== "maintenance") {
      throw new Error("운영 상태를 다시 선택해 주세요.");
    }

    const startsAt = nullableDate(body.startsAt, "시작 시간");
    const endsAt = nullableDate(body.endsAt, "종료 시간");
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      throw new Error("종료 시간은 시작 시간보다 늦어야 합니다.");
    }

    const affectedFeatures = Array.isArray(body.affectedFeatures)
      ? body.affectedFeatures
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12)
      : [];
    if (affectedFeatures.some((item) => item.length > 40)) {
      throw new Error("영향 기능은 항목당 40자 이내로 입력해 주세요.");
    }

    const payload = {
      affected_features: affectedFeatures,
      android_force_update: body.androidForceUpdate === true,
      android_min_version: version(body.androidMinVersion, "Android 최소 버전"),
      android_store_url: nullableHttpsUrl(body.androidStoreUrl, "Android 업데이트 주소"),
      ends_at: endsAt,
      id: 1,
      ios_force_update: body.iosForceUpdate === true,
      ios_min_version: version(body.iosMinVersion, "iOS 최소 버전"),
      ios_store_url: nullableHttpsUrl(body.iosStoreUrl, "iOS 업데이트 주소"),
      message: requiredText(body.message, 500, "안내 내용"),
      mode: mode as AppServiceMode,
      starts_at: startsAt,
      title: requiredText(body.title, 80, "안내 제목"),
      updated_at: new Date().toISOString(),
      updated_by: access.user.id,
    };

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("app_service_status")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (error) {
      console.error("앱 서비스 상태 저장 오류:", error.message);
      return NextResponse.json({ error: "운영 상태를 저장하지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json({ status: normalizeAppServiceStatus(data) });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "입력값을 확인해 주세요.",
    }, { status: 400 });
  }
}
