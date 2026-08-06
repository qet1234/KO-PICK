"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";

type SocialProvider = "google" | "kakao" | "naver" | "apple";
type SupabaseOAuthProvider = "google" | "kakao";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<SocialProvider | null>(null);
  const [message, setMessage] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const allRequiredAccepted = termsAccepted && privacyAccepted;

  const prepareRequiredConsent = async () => {
    if (!allRequiredAccepted) {
      throw new Error("이용약관과 개인정보 수집·이용에 각각 동의해 주세요.");
    }

    const response = await fetch("/api/auth/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ termsAccepted, privacyAccepted }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) throw new Error(data?.error || "로그인 동의를 처리하지 못했습니다.");
  };

  const handleSocialLogin = async (
    provider: SupabaseOAuthProvider,
    activeKey: Exclude<SocialProvider, "apple" | "naver">,
    providerLabel: string,
  ) => {
    if (loading) return;
    if (!allRequiredAccepted) {
      setMessage("이용약관과 개인정보 수집·이용에 각각 동의해 주세요.");
      return;
    }

    try {
      setLoading(true);
      setActiveProvider(activeKey);
      setMessage(`${providerLabel} 로그인 페이지로 이동하고 있어요.`);

      await prepareRequiredConsent();

      const next = new URLSearchParams(window.location.search).get("next") || "/";
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", next.startsWith("/") ? next : "/");

      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callback.toString(),
          skipBrowserRedirect: true,
          queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error(`${providerLabel} 로그인 주소를 만들지 못했습니다.`);
      window.location.assign(data.url);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : `${providerLabel} 로그인에 실패했습니다.`;
      console.error(`${providerLabel} 로그인 오류:`, error);
      setMessage(errorMessage);
      setLoading(false);
      setActiveProvider(null);
    }
  };

  const handleNaverLogin = async () => {
    if (loading) return;
    if (!allRequiredAccepted) {
      setMessage("이용약관과 개인정보 수집·이용에 각각 동의해 주세요.");
      return;
    }

    try {
      setLoading(true);
      setActiveProvider("naver");
      setMessage("네이버 로그인 페이지로 이동하고 있어요.");
      await prepareRequiredConsent();
      window.location.assign("/auth/naver");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "네이버 로그인을 준비하지 못했습니다.");
      setLoading(false);
      setActiveProvider(null);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorMessage = params.get("auth_error");
    const deleted = params.get("deleted");

    const resetSocialLoginState = () => {
      setLoading(false);
      setActiveProvider(null);
    };

    if (errorMessage) queueMicrotask(() => setMessage(errorMessage));
    if (deleted === "1") queueMicrotask(() => setMessage("오늘어디 회원탈퇴가 완료되었습니다."));

    window.addEventListener("pageshow", resetSocialLoginState);
    return () => window.removeEventListener("pageshow", resetSocialLoginState);
  }, []);

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-brand" aria-label="오늘어디">
          <Image className="login-brand-mark" src="/brand-mark.svg" alt="" width={64} height={64} priority />
          <strong>오늘어디</strong>
        </div>

        <div className="login-copy">
          <small>오늘어디 MEMBERSHIP</small>
          <h1>
            취향에 맞는
            <br />
            전국의 장소를
            <br />
            저장하세요
          </h1>
          <p>
            맛집, 카페, 여행지와 데이트 코스를 저장하고
            나만의 추천 기록을 한곳에서 관리할 수 있습니다.
          </p>

          <div className="login-benefits">
            <article><small>01</small><strong>맞춤 추천</strong></article>
            <article><small>02</small><strong>장소 저장</strong></article>
            <article><small>03</small><strong>코스 관리</strong></article>
          </div>
        </div>

        <div className="login-pick">
          <small>TODAY&apos;S CURATION</small>
          <strong>오늘의 픽을<br />만나보세요</strong>
        </div>
      </section>

      <section className="login-form-section">
        <div className="login-card">
          <span className="login-label">MEMBER LOGIN</span>
          <h2>다시 만나서 반가워요</h2>
          <p className="login-description">
            로그인하고 저장한 장소와 맞춤 추천 기록을 확인하세요.
          </p>

          <label className="login-consent">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
            />
            <span>
              <strong>[필수]</strong> <a href="/terms" target="_blank">이용약관</a>에 동의합니다.
            </span>
          </label>

          <label className="login-consent">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(event) => setPrivacyAccepted(event.target.checked)}
            />
            <span>
              <strong>[필수]</strong> <a href="/privacy" target="_blank">개인정보 수집·이용</a>에 동의합니다.
              <small className="login-consent-detail">
                목적: 회원 식별·로그인·저장 기능 제공 · 항목: 소셜 제공자 식별자, 이메일,
                닉네임, 프로필 이미지 · 보유: 회원탈퇴 시까지 · 거부 시 회원 기능 이용 불가
                (비회원 장소 탐색은 가능)
              </small>
            </span>
          </label>

          <div className="quick-signup-note">5초 만에 빠른 회원가입</div>

          <button
            className="kakao-button"
            type="button"
            onClick={() => void handleSocialLogin("kakao", "kakao", "카카오")}
            disabled={loading || !allRequiredAccepted}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 3C6.48 3 2 6.5 2 10.82c0 2.76 1.83 5.18 4.58 6.57l-1.16 3.72a.55.55 0 0 0 .83.62l4.4-2.93c.44.05.89.08 1.35.08 5.52 0 10-3.5 10-8.06S17.52 3 12 3Z" />
            </svg>
            {activeProvider === "kakao" ? "카카오 연결 중..." : "카카오로 시작"}
          </button>

          <div className="login-divider quick-login-divider">
            <span /><p>또는 간편 로그인</p><span />
          </div>

          <div className="quick-login-options" aria-label="간편 로그인 선택">
            <button
              type="button"
              onClick={() => void handleNaverLogin()}
              disabled={loading || !allRequiredAccepted}
              aria-label="네이버로 로그인"
            >
              <span className="quick-login-icon is-naver">N</span>
              <small>{activeProvider === "naver" ? "연결 중" : "네이버"}</small>
            </button>

            <button
              type="button"
              onClick={() => void handleSocialLogin("google", "google", "Google")}
              disabled={loading || !allRequiredAccepted}
              aria-label="Google 계정으로 로그인"
            >
              <span className="quick-login-icon is-google">
                <svg aria-hidden="true" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.909c1.702-1.566 2.683-3.874 2.683-6.616Z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.957-2.179l-2.909-2.259c-.806.54-1.835.859-3.048.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" />
                  <path fill="#FBBC05" d="M3.963 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.171.281-1.707V4.961H.956A9.001 9.001 0 0 0 0 9c0 1.45.347 2.824.956 4.039l3.007-2.332Z" />
                  <path fill="#EA4335" d="M9 3.579c1.321 0 2.507.454 3.441 1.345l2.581-2.581C13.464.891 11.426 0 9 0A9 9 0 0 0 .956 4.961l3.007 2.332C4.672 5.164 6.656 3.579 9 3.579Z" />
                </svg>
              </span>
              <small>{activeProvider === "google" ? "연결 중" : "Google"}</small>
            </button>
          </div>

          {message ? (
            <p className={`login-message${loading ? " is-status" : ""}`} role={loading ? "status" : "alert"}>
              {message}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
