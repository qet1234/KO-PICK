import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/admin";
import { requestUser } from "@/utils/security-request";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  const user = await requestUser(request);
  if (!user) return new NextResponse(null, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin.from("admin_operation_events").delete().eq("actor_user_id", user.id);
  if (error) {
    console.error("서비스 개선 데이터 동의 철회 오류:", error.message);
    return NextResponse.json({ error: "동의 철회 기록을 처리하지 못했습니다." }, { status: 503 });
  }

  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
}
