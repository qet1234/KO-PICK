import { NextResponse } from "next/server";
import {
  createLegalConsentCookie,
  LEGAL_CONSENT_COOKIE,
  legalConsentCookieOptions,
} from "@/utils/legal-consent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as {
      privacyAccepted?: boolean;
      termsAccepted?: boolean;
    } | null;

    if (body?.termsAccepted !== true || body.privacyAccepted !== true) {
      return NextResponse.json(
        { error: "이용약관과 개인정보 수집·이용에 각각 동의해 주세요." },
        { status: 400 },
      );
    }

    const response = NextResponse.json({ success: true });
    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set(
      LEGAL_CONSENT_COOKIE,
      createLegalConsentCookie(),
      legalConsentCookieOptions,
    );
    return response;
  } catch (error) {
    console.error("법적 동의 준비 오류:", error);
    return NextResponse.json(
      { error: "로그인 동의를 안전하게 처리하지 못했습니다." },
      { status: 500 },
    );
  }
}
