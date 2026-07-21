export type SpringUser = {
  id: string;
  email: string | null;
  displayName: string;
  imageUrl: string | null;
  provider: "google" | "kakao" | "naver" | string;
  role: "USER" | "ADMIN";
};

const configuredApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL?.trim();

export const springApiUrl = (
  configuredApiUrl || "http://localhost:8080"
).replace(/\/$/, "");

let csrfToken: string | null = null;
let accessToken: string | null = null;

const REQUEST_TIMEOUT_MS = 20_000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const controller = new AbortController();
  const upstreamSignal = init.signal;
  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (upstreamSignal?.aborted) {
    abortFromUpstream();
  } else {
    upstreamSignal?.addEventListener("abort", abortFromUpstream, { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted && !upstreamSignal?.aborted) {
      throw new Error("서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  }
}

async function loadCsrfToken() {
  const response = await fetchWithTimeout(`${springApiUrl}/api/auth/csrf`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("로그인 보안 토큰을 가져오지 못했습니다.");
  }
  const result = (await response.json()) as { token: string };
  csrfToken = result.token;
  return result.token;
}

export async function springFetch(
  path: string,
  init: RequestInit = {},
) {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set("X-XSRF-TOKEN", csrfToken ?? (await loadCsrfToken()));
  }

  let response = await fetchWithTimeout(`${springApiUrl}${path}`, {
    ...init,
    method,
    headers,
    credentials: "include",
  });

  if (response.status === 403 && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    csrfToken = null;
    headers.set("X-XSRF-TOKEN", await loadCsrfToken());
    response = await fetchWithTimeout(`${springApiUrl}${path}`, {
      ...init,
      method,
      headers,
      credentials: "include",
    });
  }

  return response;
}

export async function springJson<T>(path: string, init: RequestInit = {}) {
  const response = await springFetch(path, init);
  const result = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(result?.error ?? "서버 요청을 처리하지 못했습니다.");
  }
  return result as T;
}

export function socialLoginUrl(provider: "google" | "kakao" | "naver") {
  return `${springApiUrl}/oauth2/authorization/${provider}`;
}

export async function getCurrentUser() {
  const response = await springFetch("/api/auth/me");
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error("로그인 정보를 확인하지 못했습니다.");
  return (await response.json()) as SpringUser;
}

export async function logoutFromSpring() {
  await springJson<{ success: boolean }>("/api/auth/logout", { method: "POST" });
  accessToken = null;
}

export async function issueApiToken() {
  const result = await springJson<{
    accessToken: string;
    tokenType: "Bearer";
    expiresIn: number;
  }>("/api/auth/token", { method: "POST" });
  accessToken = result.accessToken;
  return result;
}

export async function springJwtFetch(path: string, init: RequestInit = {}) {
  if (!accessToken) await issueApiToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return springFetch(path, { ...init, headers });
}
