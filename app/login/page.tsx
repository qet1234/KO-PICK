"use client";

import { FormEvent, useState } from "react";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

type SocialProvider = Extract<Provider, "google" | "kakao" | "apple">;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<
    SocialProvider | "email" | null
  >(null);
  const [message, setMessage] = useState("");

  const handleSocialLogin = async (
    provider: SocialProvider,
    providerLabel: string
  ) => {
    if (loading) return;

    try {
      setLoading(true);
      setActiveProvider(provider);
      setMessage("");

      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo:
            "https://koreapick.duckdns.org/auth/callback",
          ...(provider === "google"
            ? {
                queryParams: {
                  prompt: "select_account",
                },
              }
            : {}),
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : providerLabel + " 로그인에 실패했습니다.";

      console.error(providerLabel + " 로그인 오류:", error);
      setMessage(errorMessage);
      setLoading(false);
      setActiveProvider(null);
    }
  };

  const handleGoogleLogin = () =>
    handleSocialLogin("google", "Google");

  const handleComingSoon = (providerLabel: string) => {
    if (loading) return;
    setMessage(providerLabel + " 로그인은 현재 준비 중입니다.");
  };

  const handleEmailLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    try {
      setLoading(true);
      setActiveProvider("email");
      setMessage("");

      if (!email || !password) {
        throw new Error(
          "이메일과 비밀번호를 입력해 주세요."
        );
      }

      const supabase = createClient();

      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        throw error;
      }

      window.location.assign("/");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "이메일 로그인에 실패했습니다.";

      setMessage(errorMessage);
      setLoading(false);
      setActiveProvider(null);
    }
  };

  return (
    <main className="login-page">
      <section className="login-visual">
        <div
          className="login-brand"
          aria-label="코리아픽"
        >
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
            <article>
              <small>01</small>
              <strong>맞춤 추천</strong>
            </article>

            <article>
              <small>02</small>
              <strong>장소 저장</strong>
            </article>

            <article>
              <small>03</small>
              <strong>코스 관리</strong>
            </article>
          </div>
        </div>

        <div className="login-pick">
          <small>TODAY&apos;S CURATION</small>
          <strong>
            오늘의 픽을
            <br />
            만나보세요
          </strong>
        </div>
      </section>

      <section className="login-form-section">
        <div className="login-card">
          <span className="login-label">
            MEMBER LOGIN
          </span>

          <h2>다시 만나서 반가워요</h2>

          <p className="login-description">
            로그인하고 저장한 장소와 맞춤 추천 기록을
            확인하세요.
          </p>

          <div className="quick-signup-note">
            5초 만에 빠른 회원가입
          </div>

          <button
            className="kakao-button"
            type="button"
            onClick={() =>
              void handleSocialLogin("kakao", "카카오")
            }
            disabled={loading}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
            >
              <path d="M12 3C6.48 3 2 6.5 2 10.82c0 2.76 1.83 5.18 4.58 6.57l-1.16 3.72a.55.55 0 0 0 .83.62l4.4-2.93c.44.05.89.08 1.35.08 5.52 0 10-3.5 10-8.06S17.52 3 12 3Z" />
            </svg>
            {activeProvider === "kakao"
              ? "카카오 연결 중..."
              : "카카오로 시작"}
          </button>

          <div className="login-divider quick-login-divider">
            <span />
            <p>또는 간편 로그인</p>
            <span />
          </div>

          <div
            className="quick-login-options"
            aria-label="간편 로그인 선택"
          >
            <button
              type="button"
              onClick={() => handleComingSoon("네이버")}
              disabled={loading}
              aria-label="네이버로 로그인"
            >
              <span className="quick-login-icon is-naver">N</span>
              <small>네이버</small>
            </button>

            <button
              type="button"
              onClick={() =>
                void handleSocialLogin("apple", "Apple")
              }
              disabled={loading}
              aria-label="Apple로 로그인"
            >
              <span className="quick-login-icon is-apple">A</span>
              <small>
                {activeProvider === "apple" ? "연결 중" : "Apple"}
              </small>
            </button>

            <button
              type="button"
              onClick={() => handleComingSoon("휴대폰")}
              disabled={loading}
              aria-label="휴대폰 번호로 로그인"
            >
              <span className="quick-login-icon is-phone">☎</span>
              <small>휴대폰</small>
            </button>
          </div>

          <button
            className="google-button"
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <span>G</span>
            {activeProvider === "google"
              ? "Google 연결 중..."
              : "Google 계정으로 계속하기"}
          </button>

          <div className="login-divider">
            <span />
            <p>또는 이메일로 로그인</p>
            <span />
          </div>

          <form onSubmit={handleEmailLogin}>
            <label htmlFor="email">이메일</label>

            <input
              id="email"
              type="email"
              value={email}
              placeholder="example@email.com"
              autoComplete="email"
              onChange={(event) =>
                setEmail(event.target.value)
              }
            />

            <label htmlFor="password">비밀번호</label>

            <input
              id="password"
              type="password"
              value={password}
              placeholder="비밀번호 입력"
              autoComplete="current-password"
              onChange={(event) =>
                setPassword(event.target.value)
              }
            />

            <button
              className="email-login-button"
              type="submit"
              disabled={loading}
            >
              {activeProvider === "email" ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <button
            className="signup-link"
            type="button"
            onClick={() =>
              setMessage(
                "회원가입 기능은 다음 단계에서 연결됩니다."
              )
            }
          >
            아직 코리아픽 계정이 없나요? 회원가입
          </button>

          {message ? (
            <p className="login-message" role="alert">
              {message}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
