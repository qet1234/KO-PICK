import { createAdminClient } from "@/utils/admin";
import { hashCode, isChallenge } from "@/utils/mobile-auth-exchange";
import { boundedJson } from "@/utils/security-request";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
  const body = await boundedJson(request, 1024);
  const code = typeof body?.code === "string" ? body.code : "";
  const verifier = typeof body?.verifier === "string" ? body.verifier : "";
  if (!isChallenge(code) || !isChallenge(verifier)) return Response.json({ error: "Invalid exchange" }, { status: 400, headers });
  try {
    const { data, error } = await createAdminClient().rpc("consume_mobile_auth_exchange", {
      p_code_hash: hashCode(code), p_challenge: hashCode(verifier),
    });
    if (error) throw error;
    if (typeof data !== "string") return Response.json({ error: "Login expired or invalid" }, { status: 400, headers });
    return Response.json({ token_hash: data }, { headers });
  } catch { return Response.json({ error: "Login unavailable" }, { status: 503, headers }); }
}
