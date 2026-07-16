import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error");
  const errorDescription =
    requestUrl.searchParams.get("error_description");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const createErrorRedirect = (message: string) => {
    const destination = new URL("/", appUrl);
    destination.searchParams.set("auth_error", message);

    return NextResponse.redirect(destination);
  };

  if (oauthError || errorDescription) {
    console.error("Google OAuth 오류:", {
      oauthError,
      errorDescription,
    });

    return createErrorRedirect(
      errorDescription ?? oauthError ?? "OAuth 인증 오류"
    );
  }

  if (!code) {
    console.error("Google OAuth 인증 코드가 없습니다.");

    return createErrorRedirect(
      "Google 인증 코드가 전달되지 않았습니다."
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

  const cookieStore = await cookies();

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value, options }) => {
              cookieStore.set(name, value, options);
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

  console.log("Google OAuth 로그인 성공:", {
    userId: data.user?.id,
    email: data.user?.email,
  });

  return NextResponse.redirect(new URL("/", appUrl));
}