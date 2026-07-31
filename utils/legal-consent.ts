import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/utils/legal-document-versions";

export const LEGAL_CONSENT_COOKIE = "kopick_legal_consent";
const MAX_AGE_SECONDS = 60 * 15;

type ConsentPayload = {
  issuedAt: number;
  privacyVersion: string;
  termsVersion: string;
};
function signingKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("법적 동의 서명용 서버 설정이 없습니다.");
  return key;
}

function signature(payload: string) {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export function createLegalConsentCookie() {
  const payload = Buffer.from(JSON.stringify({
    issuedAt: Date.now(),
    privacyVersion: PRIVACY_VERSION,
    termsVersion: TERMS_VERSION,
  } satisfies ConsentPayload)).toString("base64url");

  return `${payload}.${signature(payload)}`;
}

export function verifyLegalConsentCookie(value: string | undefined) {
  if (!value) return false;
  const [payload, receivedSignature, ...rest] = value.split(".");
  if (!payload || !receivedSignature || rest.length > 0) return false;

  const expectedSignature = signature(payload);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ConsentPayload;
    return parsed.termsVersion === TERMS_VERSION &&
      parsed.privacyVersion === PRIVACY_VERSION &&
      Number.isFinite(parsed.issuedAt) &&
      parsed.issuedAt <= Date.now() + 30_000 &&
      parsed.issuedAt >= Date.now() - MAX_AGE_SECONDS * 1000;
  } catch {
    return false;
  }
}

export const legalConsentCookieOptions = {
  httpOnly: true,
  maxAge: MAX_AGE_SECONDS,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
