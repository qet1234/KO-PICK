import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getAdminAccess } from "@/utils/admin";

type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";

const approvalStatuses = new Set<ApprovalStatus>([
  "pending",
  "approved",
  "rejected",
  "suspended",
]);

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  }

  const access = await getAdminAccess();
  if (!access.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!access.authorized) return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });

  try {
    const { id } = await params;
    if (!uuidPattern.test(id)) {
      return NextResponse.json({ error: "입점 신청 식별자가 올바르지 않습니다." }, { status: 400 });
    }

    const body = await request.json() as Record<string, unknown>;
    const status = body.status;
    if (typeof status !== "string" || !approvalStatuses.has(status as ApprovalStatus)) {
      return NextResponse.json({ error: "지원하지 않는 입점 상태입니다." }, { status: 400 });
    }

    const rawReviewNote = body.reviewNote;
    if (rawReviewNote !== null && rawReviewNote !== undefined && typeof rawReviewNote !== "string") {
      return NextResponse.json({ error: "검토 메모 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const reviewNote = typeof rawReviewNote === "string" ? rawReviewNote.trim() : "";
    if (reviewNote.length > 500) {
      return NextResponse.json({ error: "검토 메모는 500자 이내로 입력해 주세요." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("merchant_stores")
      .update({
        approval_status: status,
        review_note: reviewNote || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: access.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id,approval_status,review_note,reviewed_at,reviewed_by,updated_at")
      .single();

    if (error) {
      console.error("입점 승인 저장 오류:", error.message);
      return NextResponse.json({ error: "입점 상태를 저장하지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json({ store: data });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "입력값을 확인해 주세요.",
    }, { status: 400 });
  }
}
