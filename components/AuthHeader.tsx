"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../utils/supabase/client";

export default function AuthHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const loadSession = async () => {
      const {
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error(
          "로그인 사용자 확인 오류:",
          error.message
        );
      }

      setUser(error ? null : currentUser);
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

  const handleLogout = async () => {
    const supabase = createClient();

    // 연결된 소셜 계정이 아니라 현재 KO-PICK 사이트 세션만 종료합니다.
    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setUser(null);
    window.location.replace("/login");
  };

  if (loading) {
    return (
      <button
        className="header-login-button"
        type="button"
        disabled
      >
        확인 중
      </button>
    );
  }

  if (user) {
    return (
      <div className="header-user">
        <span>
          {user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            user.email}
        </span>

        <Link
          className="header-couple-button"
          href="/couple"
        >
          둘만의 공간
        </Link>

        <Link
          className="header-account-button"
          href="/account"
        >
          계정 설정
        </Link>

        <button
          className="header-login-button"
          type="button"
          onClick={handleLogout}
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="header-auth-buttons">
      <Link
        className="header-login-button"
        href="/login"
      >
        로그인
      </Link>

      <Link
        className="header-signup-button"
        href="/login?mode=signup"
      >
        시작하기
      </Link>
    </div>
  );
}
