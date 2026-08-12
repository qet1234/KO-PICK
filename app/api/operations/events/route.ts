import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/admin";

const VISITOR_COOKIE = "todaywhere_ops_visitor";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_TYPES = new Set([
  "search_success", "search_no_results", "place_card_click", "map_open", "directions_open",
  "booking_open", "app_error", "app_crash", "api_request",
]);

function shortText(value: unknown, maximum: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maximum) : null;
}

function integer(value: unknown, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, Math.round(parsed))) : null;
}

function safeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, string | number | boolean | null> = {};
  for (const [key, item] of Object.entries(value).slice(0, 12)) {
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(key)) continue;
    if (typeof item === "string") result[key] = item.slice(0, 120);
    else if (typeof item === "number" || typeof item === "boolean" || item === null) result[key] = item;
  }
  return result;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return new NextResponse(null, { status: 403 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const eventType = shortText(body?.eventType, 40);
  const feature = shortText(body?.feature, 60);
  const platform = body?.platform === "android" || body?.platform === "ios" ? body.platform : "web";
  if (!eventType || !EVENT_TYPES.has(eventType) || !feature) {
    return NextResponse.json({ error: "운영 이벤트 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const suppliedVisitor = shortText(body?.visitorId, 36);
  const cookieVisitor = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = suppliedVisitor && UUID_PATTERN.test(suppliedVisitor)
    ? suppliedVisitor
    : cookieVisitor && UUID_PATTERN.test(cookieVisitor)
      ? cookieVisitor
      : randomUUID();

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("admin_operation_events").insert({
    category: shortText(body?.category, 60),
    duration_ms: integer(body?.durationMs, 0, 120000),
    error_message: shortText(body?.errorMessage, 500),
    event_bucket: Math.floor(Date.now() / 60_000),
    event_type: eventType,
    feature,
    metadata: safeMetadata(body?.metadata),
    place_id: body?.placeId === undefined ? null : shortText(String(body.placeId), 120),
    place_name: shortText(body?.placeName, 160),
    platform,
    route: shortText(body?.route, 300),
    status_code: integer(body?.statusCode, 0, 599),
    success: body?.success !== false,
    visitor_id: visitorId,
  });
  if (error && error.code !== "23505") {
    console.error("운영 이벤트 저장 오류:", error.message);
    return NextResponse.json({ error: "운영 이벤트를 저장하지 못했습니다." }, { status: 503 });
  }

  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Cache-Control", "private, no-store");
  if (platform === "web" && visitorId !== cookieVisitor) {
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
