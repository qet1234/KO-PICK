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
let browserRefreshToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

const ACCESS_TOKEN_KEY = "kopick_access_token";
const REFRESH_TOKEN_KEY = "kopick_refresh_token";
const ACCESS_EXPIRES_AT_KEY = "kopick_access_expires_at";

const REQUEST_TIMEOUT_MS = 20_000;
const API_READY_TIMEOUT_MS = 90_000;
const API_READY_POLL_MS = 2_000;
const API_READY_REQUEST_TIMEOUT_MS = 10_000;

function sessionValue(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function storeBrowserTokens(
  nextAccessToken: string,
  refreshToken: string,
  expiresIn: number,
) {
  accessToken = nextAccessToken;
  browserRefreshToken = refreshToken;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, nextAccessToken);
    window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    window.sessionStorage.setItem(
      ACCESS_EXPIRES_AT_KEY,
      String(Date.now() + Math.max(0, expiresIn) * 1000),
    );
  } catch {
    // In-memory access still works when private browsing blocks sessionStorage.
  }
}

function clearBrowserTokens() {
  accessToken = null;
  browserRefreshToken = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    window.sessionStorage.removeItem(ACCESS_EXPIRES_AT_KEY);
  } catch {
    // Nothing else to clear when browser storage is unavailable.
  }
}

function acceptOAuthTokensFromUrl() {
  if (typeof window === "undefined" || !window.location.hash) return;
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const nextAccessToken = fragment.get("access_token");
  const nextRefreshToken = fragment.get("refresh_token");
  const expiresIn = Number(fragment.get("expires_in") ?? "0");
  if (!nextAccessToken || !nextRefreshToken) return;

  storeBrowserTokens(
    nextAccessToken,
    nextRefreshToken,
    Number.isFinite(expiresIn) ? expiresIn : 0,
  );

  const cleanUrl = new URL(window.location.href);
  cleanUrl.hash = "";
  cleanUrl.searchParams.delete("login");
  window.history.replaceState(
    {},
    "",
    cleanUrl.pathname + cleanUrl.search,
  );
}

function currentAccessToken() {
  acceptOAuthTokensFromUrl();
  if (!accessToken) accessToken = sessionValue(ACCESS_TOKEN_KEY);
  return accessToken;
}

async function springApiIsReady() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    API_READY_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${springApiUrl}/actuator/health`, {
      cache: "no-store",
      credentials: "omit",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) return false;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return false;

    const health = (await response.json().catch(() => null)) as {
      status?: string;
    } | null;

    return health?.status === "UP";
  } catch {
    // Render's wake-up page can fail CORS until the Spring service is ready.
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function waitForSpringApiReady() {
  const deadline = Date.now() + API_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (await springApiIsReady()) return;

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, Math.min(API_READY_POLL_MS, remaining));
    });
  }

  throw new Error(
    "로그인 서버가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.",
  );
}

// Remove OAuth credentials from the address bar before React renders or any
// deferred third-party map script can execute.
acceptOAuthTokensFromUrl();

async function refreshBrowserAccessToken() {
  if (refreshPromise) return refreshPromise;
  const refreshToken = browserRefreshToken ?? sessionValue(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    const response = await fetchWithTimeout(
      `${springApiUrl}/api/auth/refresh-token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      },
    );
    if (!response.ok) {
      clearBrowserTokens();
      return null;
    }
    const result = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
    storeBrowserTokens(
      result.accessToken,
      result.refreshToken,
      result.expiresIn,
    );
    return result.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

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
  const browserAccessToken = currentAccessToken();

  if (browserAccessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${browserAccessToken}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (
    !browserAccessToken &&
    !["GET", "HEAD", "OPTIONS"].includes(method)
  ) {
    headers.set("X-XSRF-TOKEN", csrfToken ?? (await loadCsrfToken()));
  }

  let response = await fetchWithTimeout(`${springApiUrl}${path}`, {
    ...init,
    method,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && browserAccessToken) {
    const refreshedAccessToken = await refreshBrowserAccessToken();
    if (refreshedAccessToken) {
      headers.set("Authorization", `Bearer ${refreshedAccessToken}`);
      response = await fetchWithTimeout(`${springApiUrl}${path}`, {
        ...init,
        method,
        headers,
        credentials: "include",
      });
    }
  }

  if (
    response.status === 403 &&
    !browserAccessToken &&
    !["GET", "HEAD", "OPTIONS"].includes(method)
  ) {
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
  const refreshToken = browserRefreshToken ?? sessionValue(REFRESH_TOKEN_KEY);
  try {
    if (refreshToken) {
      await fetchWithTimeout(`${springApiUrl}/api/auth/logout-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } else {
      await springJson<{ success: boolean }>("/api/auth/logout", { method: "POST" });
    }
  } finally {
    clearBrowserTokens();
  }
}

export async function issueApiToken() {
  const existingAccessToken = currentAccessToken();
  if (existingAccessToken) {
    const expiresAt = Number(sessionValue(ACCESS_EXPIRES_AT_KEY) ?? "0");
    return {
      accessToken: existingAccessToken,
      tokenType: "Bearer" as const,
      expiresIn: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)),
    };
  }
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
