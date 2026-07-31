import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import {
  LEGAL_CONSENT_COOKIE,
  verifyLegalConsentCookie,
} from "@/utils/legal-consent";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/utils/legal-document-versions";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = safeNext(requestUrl.searchParams.get("next"));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || requestUrl.origin;

  const errorRedirect = (message: string) => {
    const destination = new URL("/login", appUrl);
    destination.searchParams.set("auth_error", message);
    const response = NextResponse.redirect(destination);
    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set(LEGAL_CONSENT_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/", sameSite: "lax" });
    return response;
  };

  if (oauthError || errorDescription) {
    return errorRedirect(errorDescription ?? oauthError ?? "OAuth 인증 오류");
  }
  if (!code) return errorRedirect("OAuth 인증 코드가 전달되지 않았습니다.");

  let consentValid = false;
  try {
    consentValid = verifyLegalConsentCookie(request.cookies.get(LEGAL_CONSENT_COOKIE)?.value);
  } catch (error) {
    console.error("로그인 동의 서명 검증 오류:", error);
  }
  if (!consentValid) return errorRedirect("로그인 동의가 만료되었습니다. 필수 항목에 다시 동의해 주세요.");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return errorRedirect("Supabase 환경변수가 설정되지 않았습니다.");
  }

  const successResponse = NextResponse.redirect(new URL(next, appUrl));
  successResponse.headers.set("Cache-Control", "private, no-store");

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          successResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return errorRedirect(error.message);
  if (!data.session) return errorRedirect("로그인 세션을 생성하지 못했습니다.");

  const { error: consentError } = await supabase.rpc("record_user_legal_consents", {
    p_privacy_version: PRIVACY_VERSION,
    p_source: data.user.app_metadata.provider || "social",
    p_terms_version: TERMS_VERSION,
  });
  if (consentError) {
    console.error("로그인 동의 기록 오류:", consentError);
    return errorRedirect("필수 동의 내역을 기록하지 못해 로그인을 완료하지 않았습니다.");
  }

  successResponse.cookies.set(LEGAL_CONSENT_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });

  return successResponse;
}
