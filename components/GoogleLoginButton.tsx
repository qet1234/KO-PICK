"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

export default function GoogleLoginButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();

    const loadSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("세션 확인 오류:", error.message);
      }

      setUser(session?.user ?? null);
      setLoading(false);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
    if (loading) {
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "http://localhost:3000/auth/callback",

          queryParams: {
            prompt: "select_account",
          },

          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.url) {
        throw new Error(
          "Google 계정 선택 주소를 생성하지 못했습니다."
        );
      }

      window.location.assign(data.url);
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

  const handleLogout = async () => {
    try {
      setLoading(true);
      setMessage("");

      const supabase = createClient();

      const { error } = await supabase.auth.signOut({
        scope: "local",
      });

      if (error) {
        throw error;
      }

      setUser(null);
      window.location.assign("/");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "로그아웃에 실패했습니다.";

      console.error("로그아웃 오류:", error);
      setMessage(errorMessage);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <button
        className="login-button"
        type="button"
        disabled
      >
        확인 중...
      </button>
    );
  }

  if (user) {
    return (
      <div className="login-area">
        <span
          style={{
            marginRight: 10,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            user.email}
        </span>

        <button
          className="login-button"
          type="button"
          onClick={handleLogout}
        >
          로그아웃
        </button>

        {message ? (
          <p className="login-error" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="login-area">
      <button
        className="login-button"
        type="button"
        onClick={handleGoogleLogin}
      >
        <span className="google-mark">G</span>
        <span>Google 계정 선택</span>
      </button>

      {message ? (
        <p className="login-error" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}