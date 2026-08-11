import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/admin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { visitorId?: unknown } | null;
  const visitorId = typeof body?.visitorId === "string" ? body.visitorId.trim() : "";
  if (!UUID_PATTERN.test(visitorId)) {
    return NextResponse.json({ error: "방문자 식별자 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("admin_operation_events").delete().eq("visitor_id", visitorId);
  if (error) {
    console.error("서비스 개선 데이터 동의 철회 오류:", error.message);
    return NextResponse.json({ error: "동의 철회 기록을 처리하지 못했습니다." }, { status: 503 });
  }

  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
}
