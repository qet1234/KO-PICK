"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type SocialProvider = "google" | "kakao" | "naver" | "apple";
type SupabaseOAuthProvider = "google" | "kakao";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<SocialProvider | null>(null);
  const [message, setMessage] = useState("");

  const handleSocialLogin = async (
    provider: SupabaseOAuthProvider,
    activeKey: Exclude<SocialProvider, "apple" | "naver">,
    providerLabel: string,
  ) => {
    if (loading) return;

    try {
      setLoading(true);
      setActiveProvider(activeKey);
      setMessage(`${providerLabel} 로그인 페이지로 이동하고 있어요.`);

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

  const handleNaverLogin = () => {
    if (loading) return;

    setLoading(true);
    setActiveProvider("naver");
    setMessage("네이버 로그인 페이지로 이동하고 있어요.");
    window.location.assign("/auth/naver");
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
    if (deleted === "1") queueMicrotask(() => setMessage("KO-PICK 회원탈퇴가 완료되었습니다."));

    window.addEventListener("pageshow", resetSocialLoginState);
    return () => window.removeEventListener("pageshow", resetSocialLoginState);
  }, []);

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-brand" aria-label="코리아픽">
          <span>K</span>
          <strong>코리아픽</strong>
        </div>

        <div className="login-copy">
          <small>KOREA PICK MEMBERSHIP</small>
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

          <div className="quick-signup-note">5초 만에 빠른 회원가입</div>

          <button
            className="kakao-button"
            type="button"
            onClick={() => void handleSocialLogin("kakao", "kakao", "카카오")}
            disabled={loading}
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
              onClick={handleNaverLogin}
              disabled={loading}
              aria-label="네이버로 로그인"
            >
              <span className="quick-login-icon is-naver">N</span>
              <small>{activeProvider === "naver" ? "연결 중" : "네이버"}</small>
            </button>

            <button
              type="button"
              onClick={() => setMessage("Apple 로그인은 제공 준비 중입니다.")}
              disabled={loading}
              aria-label="Apple로 로그인"
            >
              <span className="quick-login-icon is-apple">
                <svg aria-hidden="true" viewBox="0 0 384 512">
                  <path fill="currentColor" d="M319.1 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7-55.8.9-115.1 44.5-115.1 133.2 0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9ZM262.5 104.5c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3Z" />
                </svg>
              </span>
              <small>Apple</small>
            </button>

            <button
              type="button"
              onClick={() => void handleSocialLogin("google", "google", "Google")}
              disabled={loading}
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
