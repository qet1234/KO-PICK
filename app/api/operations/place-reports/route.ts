import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/admin";

const COOKIE = "todaywhere_ops_visitor";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REASONS = new Set(["incorrect_info", "closed", "wrong_location", "duplicate", "other"]);

function text(value: unknown, maximum: number, required = false) {
  const result = typeof value === "string" ? value.trim().slice(0, maximum) : "";
  if (required && !result) throw new Error("필수 신고 정보가 없습니다.");
  return result || null;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const reason = text(body.reason, 30, true)!;
    if (!REASONS.has(reason)) throw new Error("신고 사유를 다시 선택해 주세요.");

    const supplied = text(body.visitorId, 36);
    const current = request.cookies.get(COOKIE)?.value;
    const visitorId = supplied && UUID_PATTERN.test(supplied)
      ? supplied
      : current && UUID_PATTERN.test(current) ? current : randomUUID();

    let reporterUserId: string | null = null;
    const authorization = request.headers.get("authorization");
    if (authorization?.startsWith("Bearer ")) {
      const adminClient = createAdminClient();
      const { data } = await adminClient.auth.getUser(authorization.slice(7));
      reporterUserId = data.user?.id ?? null;
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.from("place_information_reports").insert({
      address: text(body.address, 300),
      category: text(body.category, 60),
      details: text(body.details, 500),
      place_id: text(body.placeId, 120, true),
      place_name: text(body.placeName, 160, true),
      platform: body.platform === "android" ? "android" : "web",
      reason,
      report_bucket: Math.floor(Date.now() / 86_400_000),
      reporter_user_id: reporterUserId,
      visitor_id: visitorId,
    });
    if (error?.code === "23505") return NextResponse.json({ ok: true, deduplicated: true });
    if (error) throw error;

    const response = NextResponse.json({ ok: true });
    if (!current && body.platform !== "android") {
      response.cookies.set(COOKIE, visitorId, { httpOnly: true, maxAge: 60 * 60 * 24 * 90, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    }
    return response;
  } catch (error) {
    console.error("장소 정보 신고 오류:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "신고를 접수하지 못했습니다." }, { status: 400 });
  }
}
