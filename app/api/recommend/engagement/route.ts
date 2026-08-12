import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/admin";
import { isOperationalFeatureEnabled } from "@/utils/feature-flags-server";

function placeIds(request: NextRequest) {
  const repeated = request.nextUrl.searchParams.getAll("id");
  const combined = request.nextUrl.searchParams.get("ids")?.split(",") ?? [];
  return [...new Set([...repeated, ...combined]
    .map((value) => value.trim().slice(0, 120))
    .filter(Boolean))]
    .slice(0, 50);
}

export async function GET(request: NextRequest) {
  if (!(await isOperationalFeatureEnabled("recommendations"))) {
    return NextResponse.json({ items: [] }, { status: 503 });
  }

  const ids = placeIds(request);
  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.rpc("get_place_engagement_scores", {
      p_days: 30,
      p_place_ids: ids,
    });
    if (error) {
      console.warn("장소 참여도 점수 조회 오류:", error.message);
      return NextResponse.json({ items: [] });
    }

    const response = NextResponse.json({ items: Array.isArray(data) ? data : [] });
    response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    return response;
  } catch (error) {
    console.warn("장소 참여도 점수 조회 실패:", error);
    return NextResponse.json({ items: [] });
  }
}
