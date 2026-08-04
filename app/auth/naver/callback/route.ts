import { timingSafeEqual } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import {
  createNaverErrorRedirect,
  createMobileNaverRedirect,
  getAppUrl,
  getNaverCallbackUrl,
  NAVER_MOBILE_PLATFORM_COOKIE,
  NAVER_MOBILE_STATE_COOKIE,
  NAVER_STATE_COOKIE,
  readNaverOAuthStates,
} from "@/utils/naver-auth";
import {
  LEGAL_CONSENT_COOKIE,
  verifyLegalConsentCookie,
} from "@/utils/legal-consent";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/utils/legal-document-versions";

export const runtime = "nodejs";

type NaverExchangeResponse = {
  token_hash?: string;
  error?: string;
  error_description?: string;
};

function statesMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const state = requestUrl.searchParams.get("state");
    const oauthError = requestUrl.searchParams.get("error");
    const oauthErrorDescription =
      requestUrl.searchParams.get("error_description");
    const storedStates = readNaverOAuthStates(
      request.cookies.get(NAVER_STATE_COOKIE)?.value,
    );
    const mobileStates = readNaverOAuthStates(
      request.cookies.get(NAVER_MOBILE_STATE_COOKIE)?.value,
    );
    const isWebState = Boolean(
      state && storedStates.some((storedState) => statesMatch(state, storedState)),
    );
    const isMobileState = Boolean(
      state && mobileStates.some((storedState) => statesMatch(state, storedState)),
    );
    const useAppLink =
      request.cookies.get(NAVER_MOBILE_PLATFORM_COOKIE)?.value === "android";
    let consentValid = false;
    try {
      consentValid = verifyLegalConsentCookie(request.cookies.get(LEGAL_CONSENT_COOKIE)?.value);
    } catch (error) {
      console.error("네이버 로그인 동의 서명 검증 오류:", error);
    }

    if (oauthError || oauthErrorDescription) {
      if (isMobileState) {
        return createMobileNaverRedirect({
          requestUrl: request.url,
          error: oauthErrorDescription ?? oauthError ?? "네이버 인증이 취소되었습니다.",
          useAppLink,
        });
      }
      return createNaverErrorRedirect(
        request.url,
        oauthErrorDescription ??
          oauthError ??
          "네이버 인증이 취소되었습니다.",
      );
    }

    if (
      !code ||
      !state ||
      (!isWebState && !isMobileState)
    ) {
      console.error("네이버 OAuth state 검증에 실패했습니다.");
      return createNaverErrorRedirect(
        request.url,
        "네이버 로그인 요청이 만료되었거나 유효하지 않습니다.",
      );
    }

    if (!isMobileState && !consentValid) {
      return createNaverErrorRedirect(
        request.url,
        "로그인 동의가 만료되었습니다. 필수 항목에 다시 동의해 주세요.",
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabasePublishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

    if (!supabaseUrl || !supabasePublishableKey) {
      console.error("네이버 로그인용 Supabase 환경변수가 없습니다.");
      const message = "네이버 로그인 서버 설정이 완료되지 않았습니다.";
      return isMobileState
        ? createMobileNaverRedirect({
            requestUrl: request.url,
            error: message,
            useAppLink,
          })
        : createNaverErrorRedirect(request.url, message);
    }

    const exchangeResponse = await fetch(
      `${supabaseUrl}/functions/v1/naver-userinfo`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabasePublishableKey}`,
          apikey: supabasePublishableKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, state }),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
    const exchange = (await exchangeResponse.json().catch(() => null)) as
      | NaverExchangeResponse
      | null;

    if (!exchangeResponse.ok || !exchange?.token_hash) {
      console.error("네이버 인증 교환 오류:", {
        status: exchangeResponse.status,
        error: exchange?.error,
        description: exchange?.error_description,
      });
      const message = exchange?.error_description ||
        `네이버 인증 정보를 확인하지 못했습니다. (${exchangeResponse.status})`;
      return isMobileState
        ? createMobileNaverRedirect({
            requestUrl: request.url,
            error: message,
            useAppLink,
          })
        : createNaverErrorRedirect(request.url, message);
    }

    if (isMobileState) {
      return createMobileNaverRedirect({
        requestUrl: request.url,
        tokenHash: exchange.token_hash,
        useAppLink,
      });
    }

    const successResponse = NextResponse.redirect(
      new URL("/", getAppUrl(request.url)),
    );
    successResponse.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate, max-age=0",
    );
    successResponse.cookies.set(NAVER_STATE_COOKIE, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: getNaverCallbackUrl(request.url).protocol === "https:",
    });

    const supabase = createServerClient(
      supabaseUrl,
      supabasePublishableKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet, headersToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              successResponse.cookies.set(name, value, options);
            });
            Object.entries(headersToSet).forEach(([name, value]) => {
              successResponse.headers.set(name, value);
            });
          },
        },
      },
    );
    const { data: sessionData, error: sessionError } =
      await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: exchange.token_hash,
      });

    if (sessionError || !sessionData.session) {
      console.error("네이버 Supabase 세션 생성 오류:", sessionError);
      return createNaverErrorRedirect(
        request.url,
        "KO-PICK 로그인 세션을 만들지 못했습니다.",
      );
    }

    const { error: consentError } = await supabase.rpc("record_user_legal_consents", {
      p_privacy_version: PRIVACY_VERSION,
      p_source: "naver",
      p_terms_version: TERMS_VERSION,
    });
    if (consentError) {
      console.error("네이버 로그인 동의 기록 오류:", consentError);
      return createNaverErrorRedirect(
        request.url,
        "필수 동의 내역을 기록하지 못해 로그인을 완료하지 않았습니다.",
      );
    }

    successResponse.cookies.set(LEGAL_CONSENT_COOKIE, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: getNaverCallbackUrl(request.url).protocol === "https:",
    });

    return successResponse;
  } catch (error) {
    console.error("네이버 로그인 처리 중 예외:", error);
    const message = "네이버 로그인 처리 중 오류가 발생했습니다.";
    const useAppLink =
      request.cookies.get(NAVER_MOBILE_PLATFORM_COOKIE)?.value === "android";
    return request.cookies.has(NAVER_MOBILE_STATE_COOKIE)
      ? createMobileNaverRedirect({
          requestUrl: request.url,
          error: message,
          useAppLink,
        })
      : createNaverErrorRedirect(request.url, message);
  }
}
