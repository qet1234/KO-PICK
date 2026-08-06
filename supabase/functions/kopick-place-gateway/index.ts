import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const PROJECT_REF = "vbwaruzncfaxnjyybudm";
const CORE_BASE = `https://${PROJECT_REF}.supabase.co/functions/v1/kopick-core`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function routePath(url: URL) {
  const marker = "/kopick-api";
  const index = url.pathname.indexOf(marker);
  return index >= 0 ? url.pathname.slice(index + marker.length) || "/" : url.pathname;
}

function forwardedHeaders(request: Request) {
  const headers = new Headers();
  for (const name of [
    "authorization",
    "apikey",
    "content-type",
    "x-client-info",
    "cf-connecting-ip",
    "x-forwarded-for",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase 관리자 환경변수가 설정되지 않았습니다.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function proxyCore(request: Request, url: URL) {
  const path = routePath(url);
  const target = `${CORE_BASE}${path}${url.search}`;
  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
  return fetch(target, {
    method,
    headers: forwardedHeaders(request),
    body,
    redirect: "manual",
  });
}

async function snapshotFallback(url: URL, fallbackReason: string): Promise<Response | null> {
  try {
    const admin = adminClient();
    const mode = url.searchParams.get("mode") || "places";
    const region = url.searchParams.get("region") || "전국";

    if (mode === "subregions") {
      const { data, error } = await admin.rpc("tour_place_subregions", { p_region: region });
      if (error) throw error;
      if (!Array.isArray(data) || data.length === 0) return null;
      return json({ subregions: data, source: "tourapi-supabase-snapshot", stale: true });
    }

    const requestedPage = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.max(1, Math.min(100, Number(url.searchParams.get("pageSize") || 12)));
    const rawCategory = url.searchParams.get("category") || "전체";
    const category = rawCategory === "맛집" ? "음식" : rawCategory;
    const detail = url.searchParams.get("detailType") || "전체";
    const sigunguCode = url.searchParams.get("sigunguCode") || "";
    const offset = (requestedPage - 1) * pageSize;

    const { data, error } = await admin.rpc("search_tour_places", {
      p_region: region,
      p_category: category,
      p_sigungu_code: sigunguCode,
      p_detail: detail,
      p_offset: offset,
      p_limit: pageSize,
    });
    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) return null;

    const totalCount = Number(data[0]?.total_count || data.length);
    const places = data.map((row: any) => ({
      id: row.content_id,
      contentTypeId: row.content_type_id,
      name: row.name,
      title: row.name,
      region: row.region || "전국",
      city: row.city || null,
      location: [row.region, row.city].filter(Boolean).join(" ") || "전국",
      category: row.category,
      detailCategory: row.detail_category || "전체",
      areaCode: row.area_code || null,
      sigunguCode: row.sigungu_code || null,
      address: row.address || null,
      latitude: Number(row.latitude || 0),
      longitude: Number(row.longitude || 0),
      imageUrl: null,
      imageLicenseStatus: "not_displayed_unverified",
      source: "한국관광공사 TourAPI 저장본",
      tel: row.tel || null,
      kakaoPlaceUrl: null,
      bookingAvailable: false,
      bookingGuide: null,
      bookingUrl: null,
    }));

    return json({
      places,
      pagination: {
        page: requestedPage,
        pageSize,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
        hasNext: requestedPage * pageSize < totalCount,
        hasPrevious: requestedPage > 1,
      },
      bookingOnly: false,
      scannedCount: places.length,
      source: "tourapi-supabase-snapshot",
      stale: true,
      fallbackReason,
    });
  } catch (error) {
    console.warn("TourAPI snapshot fallback unavailable", error);
    return null;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(request.url);
  const path = routePath(url);

  try {
    // Keep the gateway health check local. Proxying it back into another Edge
    // Function in the same Supabase project can be rejected by the platform
    // gateway before the core function runs, which produces a false 403 after
    // an otherwise successful deployment.
    if ((path === "/" || path === "/actuator/health") && request.method === "GET") {
      return json({ status: "UP", runtime: "supabase-edge", gateway: "kopick-api" });
    }
    if (path === "/api/public/tour/places" && request.method === "GET") {
      const coreResponse = await proxyCore(request, url);
      if (coreResponse.ok) return coreResponse;
      const payload = await coreResponse.clone().json().catch(() => null) as { error?: string } | null;
      const reason = payload?.error || `TourAPI 응답 오류 (${coreResponse.status})`;
      const snapshot = await snapshotFallback(url, reason);
      if (snapshot) return snapshot;
      return json({ error: reason }, 503);
    }
    return await proxyCore(request, url);
  } catch (error) {
    if (path === "/api/public/tour/places" && request.method === "GET") {
      const reason = error instanceof Error ? error.message : "장소 조회 오류";
      const snapshot = await snapshotFallback(url, reason);
      if (snapshot) return snapshot;
      return json({ error: reason }, 503);
    }
    return json({ error: error instanceof Error ? error.message : "API 요청을 처리하지 못했습니다." }, 500);
  }
});
