import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

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
    return response;
  };

  if (oauthError || errorDescription) {
    return errorRedirect(errorDescription ?? oauthError ?? "OAuth 인증 오류");
  }
  if (!code) return errorRedirect("OAuth 인증 코드가 전달되지 않았습니다.");

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

  return successResponse;
}
