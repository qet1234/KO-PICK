import "server-only";
import { createHmac } from "node:crypto";
import { createAdminClient } from "@/utils/admin";
import { createClient } from "@/utils/supabase/server";

export function securityHash(value: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("Security configuration unavailable");
  return createHmac("sha256", key).update(value).digest("hex");
}

export async function requestUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const client = authorization ? createAdminClient() : await createClient();
  if (authorization && !/^Bearer \S+$/i.test(authorization)) return null;
  const { data, error } = authorization
    ? await client.auth.getUser(authorization.slice(7))
    : await client.auth.getUser();
  return error || data.user?.is_anonymous ? null : data.user;
}

export function operationVisitorId(userId: string) {
  const hash = securityHash(`operations:v2:${userId}`);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function consumeLimit(scope: string, subject: string, limit: number, seconds: number) {
  const { data, error } = await createAdminClient().rpc("consume_security_rate_limit", {
    p_scope: scope, p_subject: securityHash(subject), p_limit: limit, p_window_seconds: seconds,
  });
  if (error) throw new Error("Security limit unavailable");
  return data === true;
}

// Bound the decoded stream too: Content-Length alone is controlled by the caller.
export async function boundedJson(request: Request, maximum = 8192): Promise<Record<string, unknown> | null> {
  if (Number(request.headers.get("content-length")) > maximum) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maximum) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch { return null; }
}
