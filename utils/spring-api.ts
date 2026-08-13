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

// TourAPI requests must run through the same-origin Next.js route. Supabase Edge
// egress can be rejected by data.go.kr with HTTP 403 even when the same key works
// from the production Vercel and Render runtimes. The ranked wrapper preserves
// the existing TourAPI behavior while lifting places with KO-PICK popularity data.
export const tourPlacesApiUrl = "/api/tour/places-ranked";

let sharedBrowserClient: ReturnType<typeof createClient> | null = null;
function browserClient() {
  if (!sharedBrowserClient) sharedBrowserClient = createClient();
  return sharedBrowserClient;
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

function errorMessage(error: { message?: string } | null | undefined, fallback: string) {
  return error?.message?.trim() || fallback;
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
  const response = await springFetch(path, init);
  const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error || "Supabase Edge Function 요청에 실패했습니다.");
  return payload as T;
}
