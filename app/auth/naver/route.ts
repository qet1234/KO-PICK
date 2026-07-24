import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getNaverCallbackUrl,
  NAVER_STATE_COOKIE,
  readNaverOAuthStates,
} from "@/utils/naver-auth";

export const runtime = "nodejs";

const NAVER_CLIENT_ID = "2q4Cf2az1due2FFaiXnu";

export async function GET(request: NextRequest) {
  const callbackUrl = getNaverCallbackUrl(request.url);
  const state = randomBytes(32).toString("base64url");
  const authorizeUrl = new URL(
    "https://nid.naver.com/oauth2.0/authorize",
  );

  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", NAVER_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl.toString());
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  const previousStates = readNaverOAuthStates(
    request.cookies.get(NAVER_STATE_COOKIE)?.value,
  );
  const validStates = [...previousStates, state].slice(-5);

  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set(NAVER_STATE_COOKIE, validStates.join("."), {
    httpOnly: true,
    maxAge: 60 * 15,
    path: "/",
    sameSite: "lax",
    secure: callbackUrl.protocol === "https:",
  });

  return response;
}
