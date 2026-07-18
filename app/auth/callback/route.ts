import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error");
  const errorDescription =
    requestUrl.searchParams.get("error_description");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    requestUrl.origin;

  const createErrorRedirect = (message: string) => {
    const destination = new URL("/", appUrl);
    destination.searchParams.set("auth_error", message);

    return NextResponse.redirect(destination);
  };

  if (oauthError || errorDescription) {
    console.error("OAuth 오류:", {
      oauthError,
      errorDescription,
    });

    return createErrorRedirect(
      errorDescription ?? oauthError ?? "OAuth 인증 오류"
    );
  }

  if (!code) {
    console.error("OAuth 인증 코드가 없습니다.");

    return createErrorRedirect(
      "OAuth 인증 코드가 전달되지 않았습니다."
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase 환경변수가 없습니다.");

    return createErrorRedirect(
      "Supabase 환경변수가 설정되지 않았습니다."
    );
  }

  const successResponse = NextResponse.redirect(
    new URL("/", appUrl)
  );

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(
            ({ name, value, options }) => {
              successResponse.cookies.set(
                name,
                value,
                options
              );
            }
          );

          Object.entries(headersToSet).forEach(
            ([name, value]) => {
              successResponse.headers.set(name, value);
            }
          );
        },
      },
    }
  );

  const { data, error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error(
      "exchangeCodeForSession 오류:",
      error.message
    );

    return createErrorRedirect(error.message);
  }

  if (!data.session) {
    console.error("OAuth 세션이 생성되지 않았습니다.");

    return createErrorRedirect(
      "로그인 세션을 생성하지 못했습니다."
    );
  }

  console.log("OAuth 로그인 성공:", {
    userId: data.user?.id,
    email: data.user?.email,
  });

  return successResponse;
}