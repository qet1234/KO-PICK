import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const APP_URL = "https://koreapick.duckdns.org";

type NaverProfile = {
  id?: string;
  email?: string;
  name?: string;
  nickname?: string;
  profile_image?: string;
};

type NaverProfileResponse = {
  resultcode?: string;
  message?: string;
  response?: NaverProfile;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchProfile(accessToken: string) {
  const response = await fetch("https://openapi.naver.com/v1/nid/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = await response.json().catch(() => null) as
    | NaverProfileResponse
    | null;

  if (!response.ok || !payload?.response?.id) {
    throw new Error(
      payload?.message || "네이버 회원 정보를 가져오지 못했습니다.",
    );
  }

  return payload.response;
}

Deno.serve(async (request) => {
  const authorization = request.headers.get("Authorization");

  try {
    if (request.method === "POST") {
      const clientId = Deno.env.get("NAVER_CLIENT_ID")?.trim();
      const clientSecret = Deno.env.get("NAVER_CLIENT_SECRET")?.trim();
      const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
      const body = await request.json().catch(() => null) as
        | { code?: string; state?: string }
        | null;
      const code = body?.code?.trim();
      const state = body?.state?.trim();

      if (!clientId || !clientSecret) {
        return json({
          error: "missing_naver_credentials",
          error_description: "Supabase의 네이버 인증키가 설정되지 않았습니다.",
        }, 500);
      }
      if (!supabaseUrl || !serviceRoleKey) {
        return json({
          error: "missing_supabase_credentials",
          error_description: "Supabase 관리자 환경이 준비되지 않았습니다.",
        }, 500);
      }
      if (!code || !state) {
        return json({
          error: "missing_authorization_code",
          error_description: "네이버 인증 코드가 없습니다.",
        }, 400);
      }

      const tokenResponse = await fetch(
        "https://nid.naver.com/oauth2.0/token",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded;charset=utf-8",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: clientId,
            client_secret: clientSecret,
            code,
            state,
          }),
        },
      );
      const tokenPayload = await tokenResponse.json().catch(() => null) as
        | {
          access_token?: string;
          error?: string;
          error_description?: string;
        }
        | null;

      if (!tokenResponse.ok || !tokenPayload?.access_token) {
        console.error("Naver token exchange failed", {
          status: tokenResponse.status,
          error: tokenPayload?.error,
          description: tokenPayload?.error_description,
        });
        return json({
          error: tokenPayload?.error || "naver_token_exchange_failed",
          error_description:
            tokenPayload?.error_description ||
            "네이버 Client Secret이 현재 애플리케이션과 일치하지 않습니다.",
        }, 502);
      }

      const profile = await fetchProfile(tokenPayload.access_token);
      const displayName =
        profile.name?.trim() ||
        profile.nickname?.trim() ||
        "네이버 사용자";
      const subjectHash = await sha256(`naver:${profile.id}`);
      const email = `naver_${subjectHash}@auth.koreapick.duckdns.org`;
      const userMetadata = {
        provider: "naver",
        name: displayName,
        full_name: displayName,
        avatar_url: profile.profile_image || null,
        picture: profile.profile_image || null,
        contact_email: profile.email || null,
        naver_subject_hash: subjectHash,
      };

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: linkData, error: linkError } =
        await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: {
            data: userMetadata,
            redirectTo: APP_URL,
          },
        });

      if (linkError || !linkData.properties.hashed_token) {
        console.error("Naver Supabase link creation failed", linkError);
        return json({
          error: "supabase_link_failed",
          error_description: "KO-PICK 로그인 세션을 만들지 못했습니다.",
        }, 500);
      }

      const { error: metadataError } =
        await adminClient.auth.admin.updateUserById(linkData.user.id, {
          user_metadata: userMetadata,
        });
      if (metadataError) {
        console.error("Naver metadata update failed", metadataError);
      }

      return json({
        token_hash: linkData.properties.hashed_token,
        id: profile.id,
        email: profile.email || null,
        name: profile.name || null,
        nickname: profile.nickname || null,
        profile_image: profile.profile_image || null,
      });
    }

    if (!authorization?.startsWith("Bearer ")) {
      return json({ error: "missing_access_token" }, 401);
    }

    const profile = await fetchProfile(authorization.slice("Bearer ".length));
    return json({
      sub: profile.id,
      id: profile.id,
      email: profile.email || null,
      email_verified: Boolean(profile.email),
      name: profile.name || profile.nickname || "네이버 사용자",
      preferred_username: profile.nickname || profile.name || null,
      picture: profile.profile_image || null,
    });
  } catch (error) {
    console.error("Naver OAuth adapter error", error);
    return json({
      error: "naver_oauth_unavailable",
      error_description:
        error instanceof Error
          ? error.message
          : "네이버 인증 서버에 연결하지 못했습니다.",
    }, 502);
  }
});
