import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export const NAVER_STATE_COOKIE = "ko_pick_naver_oauth_state";
export const NAVER_MOBILE_STATE_COOKIE = "ko_pick_naver_mobile_oauth_state";
export const NAVER_MOBILE_PLATFORM_COOKIE = "ko_pick_naver_mobile_platform";
export const NAVER_CLIENT_ID =
  process.env.NAVER_CLIENT_ID?.trim() || "2q4Cf2az1due2FFaiXnu";

export function readNaverOAuthStates(value?: string) {
  if (!value) return [];

  return value
    .split(".")
    .filter((state) => /^[A-Za-z0-9_-]{20,100}$/.test(state))
    .slice(-5);
}

export function getAppUrl(requestUrl: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const appUrl = new URL(configuredUrl || requestUrl);

  appUrl.pathname = "/";
  appUrl.search = "";
  appUrl.hash = "";

  return appUrl;
}

export function getNaverCallbackUrl(requestUrl: string) {
  return new URL("/auth/naver/callback", getAppUrl(requestUrl));
}

export function createNaverIdentityEmail(naverId: string) {
  const subjectHash = createHash("sha256")
    .update(`naver:${naverId}`)
    .digest("hex");

  return {
    email: `naver_${subjectHash}@auth.koreapick.duckdns.org`,
    subjectHash,
  };
}

export function createNaverErrorRedirect(
  requestUrl: string,
  message: string,
) {
  const destination = new URL("/login", getAppUrl(requestUrl));
  destination.searchParams.set("auth_error", message);

  const response = NextResponse.redirect(destination);
  response.cookies.set(NAVER_STATE_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: destination.protocol === "https:",
  });
  response.cookies.set(NAVER_STATE_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/auth/naver",
    sameSite: "lax",
    secure: destination.protocol === "https:",
  });

  return response;
}

export function createMobileNaverRedirect(options: {
  requestUrl: string;
  error?: string;
  tokenHash?: string;
  useAppLink?: boolean;
}) {
  const destination = options.useAppLink
    ? new URL("/auth/mobile/callback", getAppUrl(options.requestUrl))
    : new URL("kopick://auth/callback");
  const params = new URLSearchParams({ provider: "naver" });
  if (options.error) params.set("error_description", options.error);
  if (options.tokenHash) params.set("token_hash", options.tokenHash);
  destination.hash = params.toString();

  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  for (const cookieName of [
    NAVER_MOBILE_STATE_COOKIE,
    NAVER_MOBILE_PLATFORM_COOKIE,
    NAVER_STATE_COOKIE,
  ]) {
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: getAppUrl(options.requestUrl).protocol === "https:",
    });
  }
  return response;
}
