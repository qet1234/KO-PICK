const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

Deno.serve(async (request) => {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "missing_access_token" }), {
      status: 401,
      headers,
    });
  }

  try {
    const response = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: authorization },
    });
    const payload = await response.json().catch(() => null) as {
      resultcode?: string;
      message?: string;
      response?: {
        id?: string;
        email?: string;
        name?: string;
        nickname?: string;
        profile_image?: string;
      };
    } | null;

    if (!response.ok || !payload?.response?.id) {
      return new Response(JSON.stringify({
        error: "naver_userinfo_failed",
        error_description: payload?.message || "네이버 회원 정보를 가져오지 못했습니다.",
      }), { status: response.ok ? 502 : response.status, headers });
    }

    const profile = payload.response;
    return new Response(JSON.stringify({
      sub: profile.id,
      id: profile.id,
      email: profile.email || null,
      email_verified: Boolean(profile.email),
      name: profile.name || profile.nickname || "네이버 사용자",
      preferred_username: profile.nickname || profile.name || null,
      picture: profile.profile_image || null,
    }), { status: 200, headers });
  } catch (error) {
    console.error("Naver userinfo adapter error", error);
    return new Response(JSON.stringify({
      error: "naver_userinfo_unavailable",
      error_description: "네이버 회원 정보 서버에 연결하지 못했습니다.",
    }), { status: 502, headers });
  }
});
