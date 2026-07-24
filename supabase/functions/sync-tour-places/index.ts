import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase 관리자 환경변수가 설정되지 않았습니다.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function cleanServiceKey(value: string) {
  try {
    return decodeURIComponent(value.trim());
  } catch {
    return value.trim();
  }
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function itemsFrom(body: any): any[] {
  const item = body?.items?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

class TourRateLimitError extends Error {}

async function fetchTourPage(pageNo: number, numOfRows: number) {
  const serviceKey = Deno.env.get("TOUR_API_SERVICE_KEY");
  if (!serviceKey) throw new Error("TOUR_API_SERVICE_KEY가 설정되지 않았습니다.");

  const params = new URLSearchParams({
    serviceKey: cleanServiceKey(serviceKey),
    MobileOS: "ETC",
    MobileApp: Deno.env.get("TOUR_API_MOBILE_APP") || "KoreaPick",
    _type: "json",
    arrange: "Q",
    numOfRows: String(numOfRows),
    pageNo: String(pageNo),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(
      `https://apis.data.go.kr/B551011/KorService2/areaBasedList2?${params}`,
      { signal: controller.signal },
    );
    const raw = await response.text();
    if (response.status === 429) throw new TourRateLimitError("TourAPI 호출 한도에 도달했습니다.");
    if (!response.ok) throw new Error(`TourAPI 응답 오류 (${response.status})`);

    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error("TourAPI가 JSON이 아닌 응답을 반환했습니다.");
    }

    const header = payload?.response?.header;
    if (header?.resultCode && header.resultCode !== "0000") {
      const message = header.resultMsg || `TourAPI 오류 ${header.resultCode}`;
      if (/limit|quota|429|초과/i.test(message)) throw new TourRateLimitError(message);
      throw new Error(message);
    }
    return payload?.response?.body ?? {};
  } finally {
    clearTimeout(timeout);
  }
}

function classifyCategory(item: any) {
  const contentTypeId = text(item.contenttypeid);
  const title = `${text(item.title)} ${text(item.addr1)}`;
  if (contentTypeId === "15") return "축제";
  if (contentTypeId === "39") {
    return /카페|커피|베이커리|다방|스타벅스|투썸|이디야|컴포즈|메가커피|빽다방|할리스|커피빈|폴바셋|파스쿠찌|엔제리너스/i.test(title)
      ? "카페"
      : "음식";
  }
  return "관광지";
}

function classifyDetail(item: any, category: string) {
  const haystack = `${text(item.title)} ${text(item.addr1)} ${text(item.cat1)} ${text(item.cat2)} ${text(item.cat3)}`;
  if (category === "음식") {
    if (/한식|한정식|국밥|국수|갈비|백반/i.test(haystack)) return "한식";
    if (/일식|초밥|스시|라멘|우동|돈카츠/i.test(haystack)) return "일식";
    if (/중식|중국|짜장|짬뽕|마라/i.test(haystack)) return "중식";
    if (/양식|파스타|피자|스테이크|브런치/i.test(haystack)) return "양식";
    if (/해산물|횟집|조개|수산|게/i.test(haystack)) return "해산물";
    if (/분식|김밥|떡볶이|버거|샌드위치/i.test(haystack)) return "간편식";
    return "전체";
  }
  if (category === "카페") {
    if (/스타벅스|투썸|이디야|컴포즈|메가커피|빽다방|할리스|커피빈|폴바셋|파스쿠찌|엔제리너스/i.test(haystack)) return "프랜차이즈";
    if (/전망|오션뷰|바다|강변|루프탑/i.test(haystack)) return "뷰카페";
    if (/한옥|이색|테마/i.test(haystack)) return "이색카페";
    if (/베이커리|대형/i.test(haystack)) return "대형카페";
    return "감성카페";
  }
  if (category === "축제") {
    if (/불꽃/i.test(haystack)) return "불꽃축제";
    if (/음악|뮤직|콘서트|페스티벌/i.test(haystack)) return "음악 페스티벌";
    if (/먹거리|음식|푸드/i.test(haystack)) return "먹거리축제";
    if (/전통|문화제|민속/i.test(haystack)) return "전통축제";
    return "지역축제";
  }
  if (/박물관/i.test(haystack)) return "박물관";
  if (/미술관|전시관|갤러리/i.test(haystack)) return "미술관·전시관";
  if (/공원|수목원|정원/i.test(haystack)) return "공원";
  if (/테마파크|놀이공원|아쿠아리움|동물원/i.test(haystack)) return "테마파크";
  if (/궁|성|유적|사찰|고택|역사/i.test(haystack)) return "역사·유적";
  if (/산|바다|폭포|계곡|숲|해변/i.test(haystack)) return "자연명소";
  return "전체";
}

function transform(item: any, runId: string) {
  const contentId = text(item.contentid);
  const name = text(item.title);
  if (!contentId || !name) return null;

  const address = text(item.addr1) || null;
  const parts = address?.split(/\s+/) ?? [];
  const category = classifyCategory(item);
  const latitude = Number(item.mapy);
  const longitude = Number(item.mapx);

  return {
    content_id: contentId,
    content_type_id: text(item.contenttypeid) || null,
    name,
    region: parts[0] || null,
    city: parts[1] || null,
    category,
    detail_category: classifyDetail(item, category),
    area_code: text(item.areacode) || null,
    sigungu_code: text(item.sigungucode) || null,
    address,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    image_url: text(item.firstimage) || text(item.firstimage2) || null,
    tel: text(item.tel) || null,
    source_modified_at: text(item.modifiedtime) || null,
    active: true,
    sync_run_id: runId,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function readState(admin: ReturnType<typeof adminClient>) {
  const { data, error } = await admin
    .from("tour_place_sync_state")
    .select("*")
    .eq("singleton", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expectedToken = Deno.env.get("TOUR_SYNC_TOKEN");
  const suppliedToken = request.headers.get("x-sync-token");
  if (!expectedToken || suppliedToken !== expectedToken) {
    return json({ error: "동기화 권한이 없습니다." }, 401);
  }

  const admin = adminClient();
  if (request.method === "GET") {
    return json({ state: await readState(admin) });
  }
  if (request.method !== "POST") return json({ error: "지원하지 않는 요청입니다." }, 405);

  const body = await request.json().catch(() => ({}));
  const reset = body?.reset === true;
  const maxPages = Math.max(1, Math.min(10, Number(body?.maxPages || 5)));
  const pageSize = 1000;

  let state = await readState(admin);
  let runId = reset || !state?.run_id || state?.status === "complete"
    ? crypto.randomUUID()
    : String(state.run_id);
  let nextPage = reset || !state?.next_page || state?.status === "complete"
    ? 1
    : Math.max(1, Number(state.next_page));
  let importedCount = reset || state?.status === "complete" ? 0 : Number(state?.imported_count || 0);
  let totalPages = reset || state?.status === "complete" ? 1 : Number(state?.total_pages || 1);
  let totalCount = reset || state?.status === "complete" ? 0 : Number(state?.total_count || 0);

  const now = new Date().toISOString();
  const { error: startError } = await admin.from("tour_place_sync_state").upsert({
    singleton: true,
    run_id: runId,
    next_page: nextPage,
    page_size: pageSize,
    total_pages: totalPages,
    total_count: totalCount,
    imported_count: importedCount,
    status: "running",
    last_error: null,
    started_at: reset || !state?.started_at ? now : state.started_at,
    completed_at: null,
    updated_at: now,
  }, { onConflict: "singleton" });
  if (startError) throw startError;

  let pagesProcessed = 0;
  try {
    while (pagesProcessed < maxPages && nextPage <= totalPages) {
      const tourBody = await fetchTourPage(nextPage, pageSize);
      const items = itemsFrom(tourBody);
      totalCount = Number(tourBody.totalCount || totalCount || items.length);
      totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const rows = items.map((item) => transform(item, runId)).filter(Boolean);

      for (let index = 0; index < rows.length; index += 500) {
        const chunk = rows.slice(index, index + 500);
        const { error } = await admin.from("tour_places").upsert(chunk, { onConflict: "content_id" });
        if (error) throw error;
      }

      importedCount += rows.length;
      nextPage += 1;
      pagesProcessed += 1;

      const { error: progressError } = await admin.from("tour_place_sync_state").update({
        next_page: nextPage,
        total_pages: totalPages,
        total_count: totalCount,
        imported_count: importedCount,
        status: nextPage > totalPages ? "complete" : "running",
        last_error: null,
        completed_at: nextPage > totalPages ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("singleton", true);
      if (progressError) throw progressError;

      if (items.length === 0) break;
    }

    const complete = nextPage > totalPages;
    if (complete) {
      await admin.from("tour_places").update({ active: false, updated_at: new Date().toISOString() })
        .eq("active", true)
        .neq("sync_run_id", runId);
    }

    return json({
      success: true,
      complete,
      paused: false,
      pagesProcessed,
      nextPage,
      totalPages,
      totalCount,
      importedCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const paused = error instanceof TourRateLimitError;
    await admin.from("tour_place_sync_state").update({
      status: paused ? "paused" : "failed",
      last_error: message,
      updated_at: new Date().toISOString(),
    }).eq("singleton", true);

    return json({
      success: false,
      complete: false,
      paused,
      error: message,
      nextPage,
      totalPages,
      totalCount,
      importedCount,
    }, paused ? 202 : 500);
  }
});
