"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleGoogleLogin = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setMessage("");

      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            "https://koreapick.duckdns.org/auth/callback",
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Google 로그인에 실패했습니다.";

      console.error("Google 로그인 오류:", error);
      setMessage(errorMessage);
      setLoading(false);
    }
  };

  const handleEmailLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    try {
      setLoading(true);
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

          <button
            className="google-button"
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <span>G</span>
            {loading
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
              로그인
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