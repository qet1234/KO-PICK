import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isChallenge, mobileRequestCookie, MOBILE_REQUEST_COOKIE } from "@/utils/mobile-auth-exchange";
import {
  createMobileNaverRedirect,
  getNaverCallbackUrl,
  NAVER_CLIENT_ID,
  NAVER_CLIENT_ID_IS_USABLE,
  NAVER_MOBILE_PLATFORM_COOKIE,
  NAVER_MOBILE_STATE_COOKIE,
  readNaverOAuthStates,
} from "@/utils/naver-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get("challenge");
  const appState = request.nextUrl.searchParams.get("auth_state");
  if (!isChallenge(challenge) || !isChallenge(appState)) {
    return createMobileNaverRedirect({ requestUrl: request.url, error: "앱을 최신 버전으로 업데이트한 후 다시 로그인해 주세요." });
  }
  if (!NAVER_CLIENT_ID_IS_USABLE) {
    console.error("NAVER_CLIENT_ID is missing or points to the deleted legacy app.");
    return createMobileNaverRedirect({
      requestUrl: request.url,
      error: "네이버 로그인 앱 설정을 갱신해야 합니다.",
    });
  }

  const callbackUrl = getNaverCallbackUrl(request.url);
  const state = randomBytes(32).toString("base64url");
  const authorizeUrl = new URL("https://nid.naver.com/oauth2.0/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", NAVER_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl.toString());
  authorizeUrl.searchParams.set("state", state);

  const previousStates = readNaverOAuthStates(
    request.cookies.get(NAVER_MOBILE_STATE_COOKIE)?.value,
  );
  const response = NextResponse.redirect(authorizeUrl);
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set(MOBILE_REQUEST_COOKIE, mobileRequestCookie(state, challenge, appState), {
    httpOnly: true, maxAge: 900, path: "/", sameSite: "lax", secure: callbackUrl.protocol === "https:",
  });
  response.cookies.set(
    NAVER_MOBILE_STATE_COOKIE,
    [...previousStates, state].slice(-5).join("."),
    {
      httpOnly: true,
      maxAge: 60 * 15,
      path: "/",
      sameSite: "lax",
      secure: callbackUrl.protocol === "https:",
    },
  );
  response.cookies.set(
    NAVER_MOBILE_PLATFORM_COOKIE,
    "custom",
    {
      httpOnly: true,
      maxAge: 60 * 15,
      path: "/",
      sameSite: "lax",
      secure: callbackUrl.protocol === "https:",
    },
  );
  return response;
}
