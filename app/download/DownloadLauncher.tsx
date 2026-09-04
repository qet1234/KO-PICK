"use client";

import { useEffect, useState } from "react";
import styles from "./download.module.css";

interface ClientEnvironment {
  devicePlatform: "android" | "ios" | null;
  isIOSSafari: boolean;
  isInstalled: boolean;
}

const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.koreapick.app";

function getDevicePlatform(): "android" | "ios" | null {
  const userAgent = window.navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1);

  if (isIOS) return "ios";
  if (/Android/.test(userAgent)) return "android";
  return null;
}

function getClientEnvironment(): ClientEnvironment {
  const devicePlatform = getDevicePlatform();
  const userAgent = window.navigator.userAgent;

  return {
    devicePlatform,
    isIOSSafari:
      devicePlatform === "ios" &&
      /Safari/.test(userAgent) &&
      !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent),
    isInstalled:
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone),
  };
}

export default function DownloadLauncher() {
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [iosActionMessage, setIOSActionMessage] = useState("");
  const [clientEnvironment, setClientEnvironment] = useState<ClientEnvironment | null>(null);
  const devicePlatform = clientEnvironment?.devicePlatform ?? null;
  const isIOSSafari = clientEnvironment?.isIOSSafari ?? false;
  const isInstalled = clientEnvironment?.isInstalled ?? false;

  useEffect(() => {
    const environmentFrame = window.requestAnimationFrame(() => {
      setClientEnvironment(getClientEnvironment());
    });

    return () => window.cancelAnimationFrame(environmentFrame);
  }, []);

  const iosStatusMessage = () => {
    if (iosActionMessage) return iosActionMessage;
    if (isInstalled) return "이 iPhone에 오늘어디가 설치되어 있습니다.";
    if (devicePlatform !== "ios") return "iPhone의 Safari에서 이 페이지를 열어 설치할 수 있습니다.";
    if (!isIOSSafari) return "Safari에서 열면 홈 화면 앱으로 설치할 수 있습니다.";
    return "버튼을 누른 뒤 Safari의 공유 → 홈 화면에 추가로 설치합니다.";
  };

  const copyInstallUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIOSActionMessage("설치 주소를 복사했습니다. iPhone Safari에서 붙여넣어 열어 주세요.");
    } catch {
      setIOSActionMessage("이 페이지 주소를 복사해 iPhone Safari에서 열어 주세요.");
    }
  };

  const handleIOSInstall = async () => {
    if (isInstalled) {
      window.location.assign("/");
      return;
    }

    setShowIOSInstructions(true);

    if (devicePlatform !== "ios" || !isIOSSafari) {
      await copyInstallUrl();
      return;
    }

    setIOSActionMessage("Safari 아래쪽 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택해 주세요.");
    window.requestAnimationFrame(() => {
      document.getElementById("ios-install-title")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  return (
    <div className={styles.downloadArea} aria-live="polite">
      <div className={styles.downloadOption}>
        <a
          className={styles.downloadButton}
          href={GOOGLE_PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Play에서 설치 / 업데이트
        </a>
        <p className={styles.status}>Android 앱은 Google Play를 통해서만 배포됩니다.</p>
      </div>

      <div className={styles.downloadOption}>
        <button
          type="button"
          className={`${styles.downloadButton} ${styles.iosButton}`}
          onClick={() => void handleIOSInstall()}
          aria-expanded={showIOSInstructions}
          aria-controls="ios-install-guide"
        >
          {isInstalled ? "설치된 오늘어디 열기" : "iPhone 앱 설치"}
        </button>
        <p className={styles.status}>{iosStatusMessage()}</p>

        {showIOSInstructions ? (
          <section
            id="ios-install-guide"
            className={styles.iosInstructions}
            aria-labelledby="ios-install-title"
          >
            <p className={styles.iosInstructionLabel}>iPhone 앱 설치</p>
            <h2 id="ios-install-title">
              {isIOSSafari ? "Safari에서 홈 화면 앱으로 설치하세요" : "Safari에서 설치 페이지를 열어 주세요"}
            </h2>
            {isIOSSafari ? (
              <>
                <p className={styles.safariNotice}>
                  iPhone은 Safari의 홈 화면 앱 설치 방식으로 사용할 수 있습니다.
                </p>
                <ol>
                  <li><strong>1</strong><span>Safari 화면 아래의 <b>공유</b> 버튼을 누릅니다.</span></li>
                  <li><strong>2</strong><span>메뉴를 내려 <b>홈 화면에 추가</b>를 선택합니다.</span></li>
                  <li><strong>3</strong><span>오른쪽 위의 <b>추가</b>를 누르면 오늘어디 아이콘이 홈 화면에 설치됩니다.</span></li>
                </ol>
              </>
            ) : (
              <p className={styles.safariNotice}>
                설치 주소를 복사했습니다. iPhone에서 Safari를 열고 주소창에 붙여넣은 뒤 “iPhone 앱 설치” 버튼을 다시 눌러 주세요.
              </p>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
