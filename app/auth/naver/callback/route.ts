import { timingSafeEqual } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  createNaverErrorRedirect,
  createNaverIdentityEmail,
  getAppUrl,
  getNaverCallbackUrl,
  NAVER_STATE_COOKIE,
  readNaverOAuthStates,
} from "@/utils/naver-auth";

export const runtime = "nodejs";

type NaverProfile = {
  id?: string;
  email?: string | null;
  name?: string | null;
  nickname?: string | null;
  profile_image?: string | null;
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

    if (oauthError || oauthErrorDescription) {
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
      !storedStates.some((storedState) =>
        statesMatch(state, storedState),
      )
    ) {
      console.error("네이버 OAuth state 검증에 실패했습니다.");
      return createNaverErrorRedirect(
        request.url,
        "네이버 로그인 요청이 만료되었거나 유효하지 않습니다.",
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabasePublishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl || !supabasePublishableKey || !serviceRoleKey) {
      console.error("네이버 로그인용 Supabase 환경변수가 없습니다.");
      return createNaverErrorRedirect(
        request.url,
        "네이버 로그인 서버 설정이 완료되지 않았습니다.",
      );
    }

    const profileResponse = await fetch(
      `${supabaseUrl}/functions/v1/naver-userinfo`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, state }),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
    const profile = (await profileResponse.json().catch(() => null)) as
      | NaverProfile
      | null;

    if (!profileResponse.ok || !profile?.id) {
      console.error("네이버 인증 교환 오류:", {
        status: profileResponse.status,
        error: profile?.error,
        description: profile?.error_description,
      });
      return createNaverErrorRedirect(
        request.url,
        profile?.error_description ||
          "네이버 인증 정보를 확인하지 못했습니다.",
      );
    }

    const displayName =
      profile.name?.trim() ||
      profile.nickname?.trim() ||
      "네이버 사용자";
    const { email, subjectHash } =
      createNaverIdentityEmail(profile.id);
    const userMetadata = {
      provider: "naver",
      name: displayName,
      full_name: displayName,
      avatar_url: profile.profile_image ?? null,
      picture: profile.profile_image ?? null,
      contact_email: profile.email ?? null,
      naver_subject_hash: subjectHash,
    };
    const adminClient = createSupabaseClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          data: userMetadata,
          redirectTo: getAppUrl(request.url).toString(),
        },
      });

    if (linkError || !linkData.properties.hashed_token) {
      console.error("네이버 Supabase 링크 생성 오류:", linkError);
      return createNaverErrorRedirect(
        request.url,
        "KO-PICK 로그인 세션을 만들지 못했습니다.",
      );
    }

    const { error: metadataError } =
      await adminClient.auth.admin.updateUserById(
        linkData.user.id,
        {
          user_metadata: userMetadata,
        },
      );

    if (metadataError) {
      console.error(
        "네이버 회원 메타데이터 갱신 오류:",
        metadataError,
      );
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
        token_hash: linkData.properties.hashed_token,
      });

    if (sessionError || !sessionData.session) {
      console.error(
        "네이버 Supabase 세션 생성 오류:",
        sessionError,
      );
      return createNaverErrorRedirect(
        request.url,
        "KO-PICK 로그인 세션을 만들지 못했습니다.",
      );
    }

    return successResponse;
  } catch (error) {
    console.error("네이버 로그인 처리 중 예외:", error);
    return createNaverErrorRedirect(
      request.url,
      "네이버 로그인 처리 중 오류가 발생했습니다.",
    );
  }
}
