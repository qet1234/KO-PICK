"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./download.module.css";

type Platform = "android" | "ios";
type DownloadStatus =
  | "checking"
  | "ready"
  | "preparing"
  | "downloading"
  | "error";

const DOWNLOAD_ENDPOINT = "/api/app-download";
const AVAILABILITY_CHECK_INTERVAL_MS = 10_000;

function getDevicePlatform(): Platform | null {
  const userAgent = window.navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1);

  if (isIOS) return "ios";
  if (/Android/.test(userAgent)) return "android";
  return null;
}

export default function DownloadLauncher() {
  const [statuses, setStatuses] = useState<Record<Platform, DownloadStatus>>({
    android: "checking",
    ios: "checking",
  });
  const hasStarted = useRef<Record<Platform, boolean>>({
    android: false,
    ios: false,
  });

  const startDownload = useCallback((platform: Platform) => {
    if (hasStarted.current[platform]) return;

    hasStarted.current[platform] = true;
    setStatuses((current) => ({ ...current, [platform]: "downloading" }));
    window.location.assign(`${DOWNLOAD_ENDPOINT}?platform=${platform}`);
  }, []);

  const checkAvailability = useCallback(async (
    platform: Platform,
    shouldStart: boolean,
  ) => {
    if (hasStarted.current[platform]) return;

    try {
      const response = await fetch(
        `${DOWNLOAD_ENDPOINT}?platform=${platform}&status=1`,
        { cache: "no-store" },
      );

      if (response.ok) {
        if (shouldStart) {
          startDownload(platform);
        } else {
          setStatuses((current) => ({ ...current, [platform]: "ready" }));
        }
        return;
      }

      setStatuses((current) => ({ ...current, [platform]: "preparing" }));
    } catch {
      setStatuses((current) => ({ ...current, [platform]: "error" }));
    }
  }, [startDownload]);

  useEffect(() => {
    const devicePlatform = getDevicePlatform();
    const checkBothPlatforms = () => {
      void checkAvailability("android", devicePlatform === "android");
      void checkAvailability("ios", devicePlatform === "ios");
    };

    checkBothPlatforms();
    const availabilityTimer = window.setInterval(
      checkBothPlatforms,
      AVAILABILITY_CHECK_INTERVAL_MS,
    );

    return () => {
      window.clearInterval(availabilityTimer);
    };
  }, [checkAvailability]);

  const statusMessage = (platform: Platform) => {
    const status = statuses[platform];
    const artifact = platform === "ios" ? "TestFlight 베타" : "최신 APK";

    if (status === "checking") return `${artifact}를 확인하고 있습니다…`;
    if (status === "ready") return `${artifact}를 받을 수 있습니다.`;
    if (status === "preparing") {
      return `${artifact}를 준비 중입니다. 완료되면 이 페이지에서 받을 수 있습니다.`;
    }
    if (status === "downloading") {
      return platform === "ios"
        ? "TestFlight 설치 화면을 열고 있습니다."
        : "다운로드를 시작했습니다.";
    }
    return "상태를 확인하지 못했습니다. 잠시 후 버튼을 다시 눌러 주세요.";
  };

  return (
    <div className={styles.downloadArea} aria-live="polite">
      <div className={styles.downloadOption}>
        <button
          type="button"
          className={styles.downloadButton}
          onClick={() => void checkAvailability("android", true)}
          disabled={
            statuses.android === "checking" ||
            statuses.android === "downloading"
          }
        >
          {statuses.android === "downloading"
            ? "다운로드 시작 중…"
            : "Android APK 다운로드"}
        </button>
        <p className={styles.status}>{statusMessage("android")}</p>
      </div>

      <div className={styles.downloadOption}>
        <button
          type="button"
          className={`${styles.downloadButton} ${styles.iosButton}`}
          onClick={() => void checkAvailability("ios", true)}
          disabled={
            statuses.ios === "checking" || statuses.ios === "downloading"
          }
        >
          {statuses.ios === "downloading"
            ? "TestFlight 여는 중…"
            : "iPhone TestFlight에서 받기"}
        </button>
        <p className={styles.status}>{statusMessage("ios")}</p>
      </div>
    </div>
  );
}
