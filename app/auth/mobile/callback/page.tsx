"use client";

import { useEffect } from "react";

const APP_CALLBACK_URL = "kopick://auth/callback";

function getAppCallbackUrl() {
  return `${APP_CALLBACK_URL}${window.location.search}${window.location.hash}`;
}

export default function MobileAuthCallbackFallbackPage() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.replace(getAppCallbackUrl());
    }, 100);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main style={{ margin: "0 auto", maxWidth: 560, padding: "64px 24px" }}>
      <h1>오늘어디 앱을 열고 있어요</h1>
      <p>
        잠시 후 앱으로 자동 이동합니다. 앱이 열리지 않으면 아래 버튼을 눌러
        주세요.
      </p>
      <button
        type="button"
        onClick={() => window.location.assign(getAppCallbackUrl())}
        style={{
          background: "#0b3628",
          border: 0,
          borderRadius: 12,
          color: "#ffffff",
          cursor: "pointer",
          display: "inline-block",
          fontWeight: 700,
          marginTop: 16,
          padding: "14px 20px",
        }}
      >
        오늘어디 앱 열기
      </button>
    </main>
  );
}
