import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getAdminAccess } from "@/utils/admin";

type SecurityCheckStatus = "ok" | "warning" | "off";

type SecurityCheck = {
  description: string;
  detail: string;
  id: string;
  label: string;
  status: SecurityCheckStatus;
};

function secureRequest(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwardedProto) return forwardedProto === "https";
  if (request.nextUrl.protocol === "https:") return true;
  return process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(request.nextUrl.hostname);
}

export async function GET(request: NextRequest) {
  const access = await getAdminAccess();
  if (!access.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!access.authorized) return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });

  const adminClient = createAdminClient();
  const serviceStatusResult = await adminClient
    .from("app_service_status")
    .select("security_management_enabled")
    .eq("id", 1)
    .maybeSingle();

  const databaseHealthy = !serviceStatusResult.error;
  const managementEnabled = databaseHealthy
    ? serviceStatusResult.data?.security_management_enabled !== false
    : false;
  const httpsHealthy = secureRequest(request);
  const serverSecretConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  const checks: SecurityCheck[] = [
    {
      description: "관리자 세션과 운영자 권한을 모두 통과한 요청만 상태를 조회할 수 있습니다.",
      detail: access.user.email ? `${access.user.email} 인증됨` : "관리자 인증됨",
      id: "admin_access",
      label: "관리자 접근 제어",
      status: "ok",
    },
    {
      description: "관리자 화면과 API가 암호화된 연결을 통해 요청되는지 확인합니다.",
      detail: httpsHealthy ? "HTTPS 연결 확인" : "HTTPS 연결을 확인하지 못함",
      id: "https",
      label: "암호화 연결",
      status: httpsHealthy ? "ok" : "warning",
    },
    {
      description: "운영 상태 데이터베이스에 관리자 서버 경로로 접근 가능한지 확인합니다.",
      detail: databaseHealthy ? "운영 DB 응답 정상" : "운영 DB 응답 오류",
      id: "database",
      label: "운영 DB 연결",
      status: databaseHealthy ? "ok" : "warning",
    },
    {
      description: "관리자 전용 서버 키가 공개 클라이언트 변수가 아닌 서버 환경에 구성돼 있는지 확인합니다.",
      detail: serverSecretConfigured ? "서버 전용 키 구성됨" : "서버 전용 키 확인 필요",
      id: "server_secret",
      label: "서버 비밀키 격리",
      status: serverSecretConfigured ? "ok" : "warning",
    },
    {
      description: "보안 관리 수행 여부를 표시합니다. 이 스위치는 실제 인증·RLS·보안 헤더를 끄지 않습니다.",
      detail: managementEnabled ? "보안 관리 활성" : "보안 관리 비활성",
      id: "management",
      label: "보안 관리",
      status: managementEnabled ? "ok" : "off",
    },
  ];

  const warningCount = checks.filter((check) => check.status === "warning").length;
  const overall = managementEnabled ? (warningCount > 0 ? "warning" : "healthy") : "disabled";

  if (serviceStatusResult.error) {
    console.error("보안 상태 DB 확인 오류:", serviceStatusResult.error.message);
  }

  return NextResponse.json(
    {
      checkedAt: new Date().toISOString(),
      checks,
      managementEnabled,
      overall,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      },
    },
  );
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
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "보안 관리 상태를 다시 선택해 주세요." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("app_service_status")
      .update({
        security_management_enabled: body.enabled,
        updated_at: new Date().toISOString(),
        updated_by: access.user.id,
      })
      .eq("id", 1);

    if (error) {
      console.error("보안 관리 상태 저장 오류:", error.message);
      return NextResponse.json({ error: "보안 관리 상태를 저장하지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json({ enabled: body.enabled });
  } catch {
    return NextResponse.json({ error: "보안 관리 상태를 저장하지 못했습니다." }, { status: 400 });
  }
}
