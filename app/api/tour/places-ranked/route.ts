import { NextRequest, NextResponse } from "next/server";
import { GET as getTourPlaces } from "@/app/api/tour/places/route";
import { createAdminClient } from "@/utils/admin";

type PlaceResult = {
  id?: string;
  source?: "TOUR_API" | "NAVER_LOCAL" | string;
};

type PopularityRow = {
  external_id: string;
  score: number | string | null;
};

async function popularityScores(places: PlaceResult[]) {
  const groups = new Map<string, string[]>();
  for (const place of places) {
    const id = String(place.id ?? "").trim();
    if (!id) continue;
    const provider = place.source === "NAVER_LOCAL" ? "naver" : "tourapi";
    const ids = groups.get(provider) ?? [];
    ids.push(id);
    groups.set(provider, ids);
  }

  const scoreMap = new Map<string, number>();
  try {
    const admin = createAdminClient();
    await Promise.all(Array.from(groups.entries()).map(async ([provider, ids]) => {
      const { data, error } = await admin.rpc("get_place_popularity_scores", {
        p_provider: provider,
        p_external_ids: Array.from(new Set(ids)).slice(0, 100),
      });
      if (error) throw error;
      for (const row of (data ?? []) as PopularityRow[]) {
        scoreMap.set(`${provider}:${row.external_id}`, Number(row.score) || 0);
      }
    }));
  } catch (error) {
    console.warn("장소 인기점수 조회 실패, 기존 순서를 유지합니다:", error);
  }
  return scoreMap;
}

export async function GET(request: NextRequest) {
  const baseResponse = await getTourPlaces(request);
  if (!baseResponse.ok) return baseResponse;

  const payload = await baseResponse.clone().json().catch(() => null) as {
    places?: PlaceResult[];
    [key: string]: unknown;
  } | null;

  if (!payload || !Array.isArray(payload.places) || payload.places.length < 2) {
    return baseResponse;
  }

  const scores = await popularityScores(payload.places);
  if (scores.size === 0) return baseResponse;

  const places = payload.places
    .map((place, index) => {
      const provider = place.source === "NAVER_LOCAL" ? "naver" : "tourapi";
      return {
        place,
        index,
        score: scores.get(`${provider}:${String(place.id ?? "")}`) ?? 0,
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ place }) => place);

  const response = NextResponse.json({ ...payload, places });
  response.headers.set("Cache-Control", baseResponse.headers.get("Cache-Control") ?? "no-store");
  return response;
}
