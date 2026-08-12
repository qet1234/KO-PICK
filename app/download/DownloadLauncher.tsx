"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [clientEnvironment, setClientEnvironment] = useState<ClientEnvironment | null>(null);
  const hasStarted = useRef(false);
  const devicePlatform = clientEnvironment?.devicePlatform ?? null;
  const isIOSSafari = clientEnvironment?.isIOSSafari ?? false;
  const isInstalled = clientEnvironment?.isInstalled ?? false;

  const startAndroidDownload = useCallback(() => {
    if (hasStarted.current) return;

    hasStarted.current = true;
    setAndroidStatus("downloading");
    window.location.assign(`${DOWNLOAD_ENDPOINT}?platform=android&download=1`);
  }, []);

  const checkAndroidAvailability = useCallback(async (shouldStart: boolean) => {
    if (hasStarted.current) return;

    try {
      const response = await fetch(
        `${DOWNLOAD_ENDPOINT}?platform=android&status=1`,
        { cache: "no-store" },
      );

      if (response.ok) {
        if (shouldStart) {
          startAndroidDownload();
        } else {
          setAndroidStatus("ready");
        }
        return;
      }

      setAndroidStatus("preparing");
    } catch {
      setAndroidStatus("error");
    }
  }, [startAndroidDownload]);

  useEffect(() => {
    const environmentFrame = window.requestAnimationFrame(() => {
      setClientEnvironment(getClientEnvironment());
    });

    const checkAndroid = () => {
      void checkAndroidAvailability(false);
    };

    checkAndroid();
    const availabilityTimer = window.setInterval(
      checkAndroid,
      AVAILABILITY_CHECK_INTERVAL_MS,
    );

    return () => {
      window.cancelAnimationFrame(environmentFrame);
      window.clearInterval(availabilityTimer);
    };
  }, [checkAndroidAvailability]);

  const androidStatusMessage = () => {
    if (androidStatus === "checking") return "최신 APK를 확인하고 있습니다…";
    if (androidStatus === "ready") return "최신 APK를 받을 수 있습니다.";
    if (androidStatus === "preparing") {
      return "최신 APK를 준비 중입니다. 완료되면 이 페이지에서 받을 수 있습니다.";
    }
    if (androidStatus === "downloading") {
      return "다운로드를 시작했습니다.";
    }
    return "상태를 확인하지 못했습니다. 잠시 후 버튼을 다시 눌러 주세요.";
  };

  const iosStatusMessage = () => {
    if (isInstalled) return "이 iPhone에 오늘어디가 설치되어 있습니다.";
    if (devicePlatform !== "ios") return "iPhone의 Safari에서 이 페이지를 열어 주세요.";
    if (!isIOSSafari) return "Safari로 이 페이지를 다시 열면 설치할 수 있습니다.";
    return "App Store와 TestFlight 없이 바로 설치할 수 있습니다.";
  };

  const handleIOSInstall = () => {
    if (isInstalled) {
      window.location.assign("/");
      return;
    }
    setShowIOSInstructions(true);
  };

  return (
    <div className={styles.downloadArea} aria-live="polite">
      <div className={styles.downloadOption}>
        <button
          type="button"
          className={styles.downloadButton}
          onClick={() => void checkAndroidAvailability(true)}
          disabled={
            androidStatus === "checking" ||
            androidStatus === "downloading"
          }
        >
          {androidStatus === "downloading"
            ? "다운로드 시작 중…"
            : "Android APK 다운로드"}
        </button>
        <p className={styles.status}>{androidStatusMessage()}</p>
      </div>

      <div className={styles.downloadOption}>
        <button
          type="button"
          className={`${styles.downloadButton} ${styles.iosButton}`}
          onClick={handleIOSInstall}
        >
          {isInstalled ? "설치된 오늘어디 열기" : "iPhone 홈 화면에 설치"}
        </button>
        <p className={styles.status}>{iosStatusMessage()}</p>

        {showIOSInstructions ? (
          <section className={styles.iosInstructions} aria-labelledby="ios-install-title">
            <p className={styles.iosInstructionLabel}>iPhone 설치 방법</p>
            <h2 id="ios-install-title">
              {isIOSSafari ? "Safari에서 세 단계만 진행하세요" : "먼저 Safari에서 열어 주세요"}
            </h2>
            {isIOSSafari ? (
              <ol>
                <li><strong>1</strong><span>화면 아래의 <b>공유</b> 버튼을 누릅니다.</span></li>
                <li><strong>2</strong><span>메뉴를 내려 <b>홈 화면에 추가</b>를 선택합니다.</span></li>
                <li><strong>3</strong><span>오른쪽 위의 <b>추가</b>를 누르면 설치가 끝납니다.</span></li>
              </ol>
            ) : (
              <p className={styles.safariNotice}>
                주소를 복사한 뒤 Safari 주소창에 붙여넣고, 다시 “iPhone 홈 화면에 설치”를 눌러 주세요.
              </p>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
