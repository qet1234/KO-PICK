const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

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
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const expectedAuthorization = serviceRoleKey
        ? `Bearer ${serviceRoleKey}`
        : null;

      if (!expectedAuthorization || authorization !== expectedAuthorization) {
        return json({ error: "unauthorized" }, 401);
      }

      const clientId = Deno.env.get("NAVER_CLIENT_ID");
      const clientSecret = Deno.env.get("NAVER_CLIENT_SECRET");
      const body = await request.json().catch(() => null) as
        | { code?: string; state?: string }
        | null;
      const code = body?.code?.trim();
      const state = body?.state?.trim();

      if (!clientId || !clientSecret) {
        return json({ error: "missing_naver_credentials" }, 500);
      }
      if (!code || !state) {
        return json({ error: "missing_authorization_code" }, 400);
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
          error: "naver_token_exchange_failed",
          error_description:
            tokenPayload?.error_description ||
            "네이버 인증 토큰을 발급받지 못했습니다.",
        }, 502);
      }

      const profile = await fetchProfile(tokenPayload.access_token);
      return json({
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
