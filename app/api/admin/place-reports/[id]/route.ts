import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getAdminAccess } from "@/utils/admin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = new Set(["open", "reviewing", "resolved", "dismissed"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  const access = await getAdminAccess();
  if (!access.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!access.authorized) return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null) as { status?: unknown } | null;
  if (!UUID_PATTERN.test(id) || typeof body?.status !== "string" || !STATUSES.has(body.status)) {
    return NextResponse.json({ error: "처리 상태가 올바르지 않습니다." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = await createAdminClient().from("place_information_reports").update({
    handled_at: body.status === "open" ? null : now,
    handled_by: body.status === "open" ? null : access.user.id,
    status: body.status,
    updated_at: now,
  }).eq("id", id);
  if (error) return NextResponse.json({ error: "신고 상태를 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
