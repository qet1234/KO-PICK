import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getNaverCallbackUrl,
  NAVER_CLIENT_ID,
  NAVER_MOBILE_PLATFORM_COOKIE,
  NAVER_MOBILE_STATE_COOKIE,
  readNaverOAuthStates,
} from "@/utils/naver-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const callbackUrl = getNaverCallbackUrl(request.url);
  const platform = request.nextUrl.searchParams.get("platform");
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
    platform === "android" ? "android" : "custom",
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
