import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/utils/admin";
import { securityHash } from "@/utils/security-request";

export const MOBILE_REQUEST_COOKIE = "todaywhere_mobile_request_v2";
export const isChallenge = (value: string | null | undefined): value is string =>
  typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
export const hashCode = (value: string) => createHash("sha256").update(value).digest("hex");

export function mobileRequestCookie(state: string, challenge: string, appState: string) {
  const payload = Buffer.from(JSON.stringify({ state, challenge, appState, expires: Date.now() + 900_000 })).toString("base64url");
  return `${payload}.${securityHash(`mobile-request:${payload}`)}`;
}

export function readMobileRequest(value: string | undefined, state: string | null) {
  if (!value || value.length > 1500 || !state) return null;
  const [payload, signature, extra] = value.split(".");
  if (extra || !isChallenge(signature)) return null;
  const expected = securityHash(`mobile-request:${payload}`);
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.state !== state || !isChallenge(data.challenge) || !isChallenge(data.appState) ||
        typeof data.expires !== "number" || data.expires < Date.now()) return null;
    return data as { state: string; challenge: string; appState: string; expires: number };
  } catch { return null; }
}

export async function createMobileExchange(challenge: string, tokenHash: string) {
  const code = randomBytes(32).toString("hex");
  const admin = createAdminClient();
  // Successful logins also clean abandoned exchanges.
  await admin.from("mobile_auth_exchanges").delete().lt("expires_at", new Date().toISOString());
  const { error } = await admin.from("mobile_auth_exchanges").insert({
    code_hash: hashCode(code), challenge, token_hash: tokenHash,
    expires_at: new Date(Date.now() + 300_000).toISOString(),
  });
  if (error) throw new Error("Mobile login exchange unavailable");
  return code;
}
