"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./download.module.css";

type DownloadStatus =
  | "checking"
  | "ready"
  | "preparing"
  | "downloading"
  | "error";

interface ClientEnvironment {
  devicePlatform: "android" | "ios" | null;
  isIOSSafari: boolean;
  isInstalled: boolean;
}

interface AndroidDownloadStatus {
  ready?: boolean;
  versionCode?: number;
  downloadUrl?: string;
}

const DOWNLOAD_ENDPOINT = "/api/app-download";
const AVAILABILITY_CHECK_INTERVAL_MS = 10_000;

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
  const [androidStatus, setAndroidStatus] = useState<DownloadStatus>("checking");
  const [androidVersionCode, setAndroidVersionCode] = useState<number | null>(null);
  const [androidDownloadUrl, setAndroidDownloadUrl] = useState(
    `${DOWNLOAD_ENDPOINT}?platform=android&download=1`,
  );
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [iosActionMessage, setIOSActionMessage] = useState("");
  const [clientEnvironment, setClientEnvironment] = useState<ClientEnvironment | null>(null);
  const devicePlatform = clientEnvironment?.devicePlatform ?? null;
  const isIOSSafari = clientEnvironment?.isIOSSafari ?? false;
  const isInstalled = clientEnvironment?.isInstalled ?? false;

  const checkAndroidAvailability = useCallback(async () => {
    try {
      const response = await fetch(
        `${DOWNLOAD_ENDPOINT}?platform=android&status=1`,
        { cache: "no-store" },
      );

      if (response.ok) {
        const result = (await response.json()) as AndroidDownloadStatus;
        if (typeof result.versionCode === "number") {
          setAndroidVersionCode(result.versionCode);
        }
        if (typeof result.downloadUrl === "string" && result.downloadUrl.startsWith("/")) {
          setAndroidDownloadUrl(result.downloadUrl);
        }
        setAndroidStatus("ready");
        return;
      }

      setAndroidStatus("preparing");
    } catch {
      setAndroidStatus("error");
    }
  }, []);

  useEffect(() => {
    const environmentFrame = window.requestAnimationFrame(() => {
      setClientEnvironment(getClientEnvironment());
    });
    const availabilityFrame = window.requestAnimationFrame(() => {
      void checkAndroidAvailability();
    });
    const availabilityTimer = window.setInterval(
      () => void checkAndroidAvailability(),
      AVAILABILITY_CHECK_INTERVAL_MS,
    );

    return () => {
      window.cancelAnimationFrame(environmentFrame);
      window.cancelAnimationFrame(availabilityFrame);
      window.clearInterval(availabilityTimer);
    };
  }, [checkAndroidAvailability]);

  const androidStatusMessage = () => {
    if (androidStatus === "checking") return "최신 Android APK를 확인하고 있습니다…";
    if (androidStatus === "ready") {
      return androidVersionCode
        ? `현재 배포 중인 최신 APK를 받을 수 있습니다. (버전 코드 ${androidVersionCode})`
        : "현재 배포 중인 최신 APK를 받을 수 있습니다.";
    }
    if (androidStatus === "preparing") {
      return "새 APK를 준비 중입니다. 완료되면 이 페이지의 같은 버튼이 자동으로 최신 파일을 가리킵니다.";
    }
    if (androidStatus === "downloading") {
      return "최신 APK 다운로드를 시작했습니다. 기존 앱을 삭제하지 말고 업데이트 설치해 주세요.";
    }
    return "최신 APK 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  };

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
          href={androidDownloadUrl}
          onClick={() => setAndroidStatus("downloading")}
        >
          Android 최신 APK 다운로드 / 업데이트
        </a>
        <p className={styles.status}>{androidStatusMessage()}</p>
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
                  iPhone은 APK나 IPA 파일을 직접 내려받는 방식이 아니라 Safari의 홈 화면 앱 설치 방식으로 사용할 수 있습니다.
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
