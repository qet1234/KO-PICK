import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/admin";
import { createClient as createSessionClient } from "@/utils/supabase/server";

const VISITOR_COOKIE = "todaywhere_visitor";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function deviceType(userAgent: string) {
  if (/bot|crawler|spider|slurp|preview/i.test(userAgent)) return "bot";
  if (/ipad|tablet|playbook|silk/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return "mobile";
  return "desktop";
}

function safePath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  try {
    const path = new URL(value, "https://todaywhere.invalid").pathname;
    return path.length <= 300 ? path : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return new NextResponse(null, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { path?: unknown } | null;
  const path = safePath(body?.path);
  if (!path || path.startsWith("/admin")) {
    return new NextResponse(null, { status: 204 });
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  const device = deviceType(userAgent);
  if (device === "bot") {
    return new NextResponse(null, { status: 204 });
  }

  const currentVisitor = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = currentVisitor && UUID_PATTERN.test(currentVisitor)
    ? currentVisitor
    : randomUUID();

  let userId: string | null = null;
  try {
    const sessionClient = await createSessionClient();
    const { data } = await sessionClient.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    // 트래픽 기록은 로그인 세션 확인 실패로 사용자 화면을 막지 않습니다.
  }

  let referrerHost: string | null = null;
  const referrer = request.headers.get("referer");
  if (referrer) {
    try {
      const host = new URL(referrer).hostname;
      referrerHost = host === request.nextUrl.hostname ? null : host.slice(0, 255);
    } catch {
      referrerHost = null;
    }
  }

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("admin_traffic_events").upsert({
      device_type: device,
      event_bucket: Math.floor(Date.now() / 60_000),
      is_authenticated: Boolean(userId),
      path,
      referrer_host: referrerHost,
      user_id: userId,
      visitor_id: visitorId,
    }, {
      ignoreDuplicates: true,
      onConflict: "visitor_id,path,event_bucket",
    });

    if (error) console.error("트래픽 기록 오류:", error.message);
  } catch (error) {
    console.error("트래픽 기록 설정 오류:", error);
  }

  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Cache-Control", "private, no-store");
  if (visitorId !== currentVisitor) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}
