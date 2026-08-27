import { NextRequest, NextResponse } from "next/server";
import { isOperationalFeatureEnabled } from "@/utils/feature-flags-server";
import { koreaRegionDistricts } from "@/utils/korea-region-districts";
import { searchWeatherLocations } from "@/utils/weather-location-search";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isOperationalFeatureEnabled("weather"))) {
    return NextResponse.json({ error: "날씨 기능을 점검하고 있습니다." }, { status: 503 });
  }

  const region = request.nextUrl.searchParams.get("region")?.trim() || "서울";
  const district = request.nextUrl.searchParams.get("district")?.trim() || "전체";
  const query = request.nextUrl.searchParams.get("query")?.trim() || "";
  const validDistricts = koreaRegionDistricts[region];

  if (!validDistricts) {
    return NextResponse.json({ error: "시·도를 다시 선택해 주세요." }, { status: 400 });
  }
  if (district === "전체") {
    return NextResponse.json({ error: "시·군·구를 먼저 선택해 주세요." }, { status: 400 });
  }
  if (!validDistricts.includes(district)) {
    return NextResponse.json({ error: "시·군·구를 다시 선택해 주세요." }, { status: 400 });
  }
  if (query.length < 2 || query.length > 30) {
    return NextResponse.json({ error: "읍·면·동/리 이름을 2자 이상 입력해 주세요." }, { status: 400 });
  }

  try {
    const locations = await searchWeatherLocations({ region, district, query });
    return NextResponse.json(
      { locations, attribution: "© OpenStreetMap contributors" },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch (error) {
    console.error("weather location search failed", error);
    return NextResponse.json({ error: "세부 지역을 찾지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}

