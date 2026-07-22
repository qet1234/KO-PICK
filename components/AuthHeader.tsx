"use client";

import { useEffect, useState } from "react";
import {
  getCurrentUser,
  issueApiToken,
  logoutFromSpring,
  type SpringUser,
} from "../utils/spring-api";

export default function AuthHeader() {
  const [user, setUser] = useState<SpringUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const justLoggedIn = new URLSearchParams(window.location.search).get("login") === "success";
    getCurrentUser()
      .then(async (currentUser) => {
        setUser(currentUser);
        if (currentUser && justLoggedIn) {
          await issueApiToken();
          const url = new URL(window.location.href);
          url.searchParams.delete("login");
          window.history.replaceState({}, "", url.pathname + url.search + url.hash);
        }
      })
      .catch((error) => console.error("로그인 사용자 확인 오류:", error))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await logoutFromSpring();
      setUser(null);
      window.location.replace("/login");
    } catch (error) {
      alert(error instanceof Error ? error.message : "로그아웃에 실패했습니다.");
    }
  };

  if (loading) {
    return <button className="header-login-button" type="button" disabled>확인 중</button>;
  }

  if (user) {
    return (
      <div className="header-user">
        <span>{user.displayName || user.email}</span>
        <a className="header-space-button" href="/spaces">함께 공간</a>
        <a className="header-account-button" href="/account">계정 설정</a>
        <button className="header-login-button" type="button" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="header-auth-buttons">
      <a className="header-login-button" href="/login">로그인</a>
      <a className="header-signup-button" href="/login?mode=signup">시작하기</a>
    </div>
  );
}
