import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const bootstrapToken = Deno.env.get("SOCIAL_AUTH_BOOTSTRAP_TOKEN");
  const suppliedToken = request.headers.get("x-bootstrap-token");
  if (!bootstrapToken || suppliedToken !== bootstrapToken) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const naverClientId = Deno.env.get("NAVER_CLIENT_ID");
  const naverClientSecret = Deno.env.get("NAVER_CLIENT_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !naverClientId || !naverClientSecret) {
    return json({
      error: "missing_environment",
      missing: [
        !supabaseUrl && "SUPABASE_URL",
        !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
        !naverClientId && "NAVER_CLIENT_ID",
        !naverClientSecret && "NAVER_CLIENT_SECRET",
      ].filter(Boolean),
    }, 500);
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const identifier = "custom:naver";
    const commonConfig = {
      name: "Naver",
      client_id: naverClientId,
      client_secret: naverClientSecret,
      enabled: true,
      email_optional: true,
      // Naver OAuth2 does not expose an OIDC discovery document and does not
      // require PKCE for the server-side authorization-code exchange.
      pkce_enabled: false,
      authorization_url: "https://nid.naver.com/oauth2.0/authorize",
      token_url: "https://nid.naver.com/oauth2.0/token",
      userinfo_url: `${supabaseUrl}/functions/v1/naver-userinfo`,
    };

    const { data: listData, error: listError } =
      await supabase.auth.admin.customProviders.listProviders();
    if (listError) throw listError;

    const exists = listData.providers.some((provider) => provider.identifier === identifier);
    const result = exists
      ? await supabase.auth.admin.customProviders.updateProvider(identifier, commonConfig)
      : await supabase.auth.admin.customProviders.createProvider({
          provider_type: "oauth2",
          identifier,
          ...commonConfig,
        });

    if (result.error) throw result.error;

    return json({
      success: true,
      action: exists ? "updated" : "created",
      provider: result.data.identifier,
      callbackUrl: `${supabaseUrl}/auth/v1/callback`,
    });
  } catch (error) {
    console.error("Social auth configuration failed", error);
    return json({
      error: "configuration_failed",
      message: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
