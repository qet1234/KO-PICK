import { createClient } from "./supabase/client";

export type SpringUser = {
  id: string;
  email: string | null;
  displayName: string;
  imageUrl: string | null;
  provider: "google" | "kakao" | "naver" | string;
  role: "USER" | "ADMIN";
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, "") ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

// 기존 컴포넌트가 사용하는 이름은 유지하지만 실제 대상은 Supabase Edge Function입니다.
export const springApiUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/kopick-api` : "";

function browserClient() {
  return createClient();
}

function displayNameFromMetadata(metadata: Record<string, unknown> | undefined, email: string | null) {
  const value =
    metadata?.display_name ?? metadata?.full_name ?? metadata?.name ??
    metadata?.user_name ?? metadata?.preferred_username ?? metadata?.nickname;
  if (typeof value === "string" && value.trim()) return value.trim();
  return email?.split("@")[0] || "사용자";
}

function imageFromMetadata(metadata: Record<string, unknown> | undefined) {
  const value = metadata?.avatar_url ?? metadata?.picture ?? metadata?.profile_image;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizedProvider(value: unknown) {
  const provider = typeof value === "string" ? value : "supabase";
  return provider.startsWith("custom:") ? provider.slice("custom:".length) : provider;
}

function parseBody(init: RequestInit) {
  if (!init.body) return {} as Record<string, unknown>;
  if (typeof init.body === "string") {
    try { return JSON.parse(init.body) as Record<string, unknown>; }
    catch { throw new Error("요청 데이터를 읽지 못했습니다."); }
  }
  throw new Error("JSON 요청만 지원합니다.");
}

function errorMessage(error: { message?: string } | null | undefined, fallback: string) {
  return error?.message?.trim() || fallback;
}

async function rpcJson<T>(name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await browserClient().rpc(name, args);
  if (error) throw new Error(errorMessage(error, "Supabase 요청을 처리하지 못했습니다."));
  if (data && typeof data === "object" && !Array.isArray(data) && "error" in data) {
    const message = (data as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) throw new Error(message);
  }
  return data as T;
}

async function edgeHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  if (publishableKey) headers.set("apikey", publishableKey);
  const { data } = await browserClient().auth.getSession();
  const token = data.session?.access_token;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

export function warmSpringApi() {
  if (typeof window === "undefined" || !springApiUrl) return;
  void fetch(`${springApiUrl}/actuator/health`, {
    cache: "no-store",
    headers: publishableKey ? { apikey: publishableKey } : undefined,
  }).catch(() => {
    // Edge Function 예열 실패는 로그인 버튼이나 화면 렌더링을 막지 않습니다.
  });
}

export function socialLoginUrl() {
  return "/login";
}

export async function getCurrentUser(): Promise<SpringUser | null> {
  const { data, error } = await browserClient().auth.getUser();
  if (error || !data.user) return null;
  const provider = normalizedProvider(
    data.user.app_metadata?.provider ?? data.user.identities?.[0]?.provider,
  );
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    displayName: displayNameFromMetadata(data.user.user_metadata, data.user.email ?? null),
    imageUrl: imageFromMetadata(data.user.user_metadata),
    provider,
    role: data.user.app_metadata?.role === "ADMIN" ? "ADMIN" : "USER",
  };
}

export async function logoutFromSpring() {
  const { error } = await browserClient().auth.signOut({ scope: "local" });
  if (error) throw new Error(errorMessage(error, "로그아웃에 실패했습니다."));
}

export async function springFetch(path: string, init: RequestInit = {}) {
  if (!springApiUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL 환경변수가 없습니다.");
  const headers = await edgeHeaders(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${springApiUrl}${path}`, { ...init, headers });
}

export async function springJson<T>(path: string, init: RequestInit = {}) {
  const method = (init.method ?? "GET").toUpperCase();
  const body = parseBody(init);
  const url = new URL(path, "https://kopick.local");
  const pathname = url.pathname;

  if (pathname === "/api/web/spaces" && method === "GET") {
    const user = await getCurrentUser();
    if (!user) throw new Error("로그인이 필요합니다.");
    return rpcJson<T>("list_my_spaces", { p_display_name: user.displayName });
  }
  if (pathname === "/api/web/spaces" && method === "POST") {
    return rpcJson<T>("create_shared_space", {
      p_type: body.type,
      p_name: body.name,
      p_display_name: body.displayName,
    });
  }
  if (pathname === "/api/web/spaces/join" && method === "POST") {
    return rpcJson<T>("join_shared_space", {
      p_invite_code: body.inviteCode,
      p_display_name: body.displayName,
    });
  }
  const inviteMatch = pathname.match(/^\/api\/web\/spaces\/([^/]+)\/invite$/);
  if (inviteMatch && method === "POST") {
    return rpcJson<T>("refresh_space_invite", { p_space_id: decodeURIComponent(inviteMatch[1]) });
  }
  const spaceMatch = pathname.match(/^\/api\/web\/spaces\/([^/]+)$/);
  if (spaceMatch && method === "DELETE") {
    const success = await rpcJson<boolean>("leave_shared_space", { p_space_id: decodeURIComponent(spaceMatch[1]) });
    return { success } as T;
  }

  if (pathname === "/api/web/reservations" && method === "GET") {
    return rpcJson<T>("list_my_reservations", {
      p_space_id: url.searchParams.get("spaceId") || null,
    });
  }
  if (pathname === "/api/web/reservations" && method === "POST") {
    return rpcJson<T>("create_reservation_plan", {
      p_space_id: body.spaceId,
      p_title: body.title,
      p_purpose: body.purpose,
      p_reservation_date: body.reservationDate,
      p_party_size: body.partySize,
      p_budget_per_person: body.budgetPerPerson ?? null,
      p_note: body.note ?? null,
    });
  }
  const candidateCreateMatch = pathname.match(/^\/api\/web\/reservations\/([^/]+)\/candidates$/);
  if (candidateCreateMatch && method === "POST") {
    return rpcJson<T>("add_reservation_candidate", {
      p_plan_id: decodeURIComponent(candidateCreateMatch[1]),
      p_place_source: body.placeSource ?? "manual",
      p_place_id: body.placeId ?? null,
      p_place_name: body.placeName,
      p_category: body.category ?? null,
      p_address: body.address ?? null,
      p_starts_at: body.startsAt,
      p_external_reservation_url: body.externalReservationUrl ?? null,
    });
  }
  const voteMatch = pathname.match(/^\/api\/web\/reservations\/candidates\/([^/]+)\/vote$/);
  if (voteMatch && method === "POST") {
    return rpcJson<T>("toggle_reservation_vote", { p_candidate_id: decodeURIComponent(voteMatch[1]) });
  }
  const finalizeMatch = pathname.match(/^\/api\/web\/reservations\/([^/]+)\/finalize$/);
  if (finalizeMatch && method === "POST") {
    return rpcJson<T>("finalize_reservation_plan", {
      p_plan_id: decodeURIComponent(finalizeMatch[1]),
      p_candidate_id: body.candidateId,
    });
  }
  const statusMatch = pathname.match(/^\/api\/web\/reservations\/([^/]+)\/status$/);
  if (statusMatch && method === "PATCH") {
    return rpcJson<T>("update_reservation_status", {
      p_plan_id: decodeURIComponent(statusMatch[1]),
      p_status: body.status,
    });
  }
  const planMatch = pathname.match(/^\/api\/web\/reservations\/([^/]+)$/);
  if (planMatch && method === "DELETE") {
    const success = await rpcJson<boolean>("delete_reservation_plan", {
      p_plan_id: decodeURIComponent(planMatch[1]),
    });
    return { success } as T;
  }

  const response = await springFetch(path, init);
  const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error || "Supabase Edge Function 요청에 실패했습니다.");
  return payload as T;
}
