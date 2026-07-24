"use client";

import { useEffect, useState } from "react";
import {
  getCurrentUser,
  logoutFromSpring,
  warmSpringApi,
  type SpringUser,
} from "../utils/spring-api";

export default function AuthHeader() {
  const [user, setUser] = useState<SpringUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    // 로그인 버튼은 즉시 표시하고, 느릴 수 있는 서버 깨우기와
    // 로그인 상태 확인은 화면을 막지 않은 채 백그라운드에서 처리합니다.
    warmSpringApi();

    getCurrentUser()
      .then((currentUser) => {
        if (!cancelled) setUser(currentUser);
      })
      .catch((error) => console.error("로그인 사용자 확인 오류:", error));

    return () => {
      cancelled = true;
    };
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

  if (user) {
    return (
      <div className="header-user">
        <span>{user.displayName || user.email}</span>
        <a className="header-reservation-button" href="/reservations">함께 예약</a>
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
      <a className="header-reservation-button" href="/reservations">함께 예약</a>
      <a
        className="header-login-button"
        href="/login"
        onPointerEnter={warmSpringApi}
        onFocus={warmSpringApi}
      >
        로그인
      </a>
      <a
        className="header-signup-button"
        href="/login?mode=signup"
        onPointerEnter={warmSpringApi}
        onFocus={warmSpringApi}
      >
        시작하기
      </a>
    </div>
  );
}
