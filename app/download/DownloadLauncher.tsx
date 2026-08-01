"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./download.module.css";

type DownloadStatus = "checking" | "preparing" | "downloading" | "error";

const DOWNLOAD_ENDPOINT = "/api/app-download";
const AVAILABILITY_CHECK_INTERVAL_MS = 10_000;

export default function DownloadLauncher() {
  const [status, setStatus] = useState<DownloadStatus>("checking");
  const hasStarted = useRef(false);

  const startDownload = useCallback(() => {
    if (hasStarted.current) return;

    hasStarted.current = true;
    setStatus("downloading");
    window.location.assign(DOWNLOAD_ENDPOINT);
  }, []);

  const checkAvailability = useCallback(async () => {
    if (hasStarted.current) return;

    try {
      const response = await fetch(`${DOWNLOAD_ENDPOINT}?status=1`, {
        cache: "no-store",
      });

      if (response.ok) {
        startDownload();
        return;
      }

      setStatus("preparing");
    } catch {
      setStatus("error");
    }
  }, [startDownload]);

  useEffect(() => {
    void checkAvailability();
    const availabilityTimer = window.setInterval(
      checkAvailability,
      AVAILABILITY_CHECK_INTERVAL_MS,
    );

    return () => {
      window.clearInterval(availabilityTimer);
    };
  }, [checkAvailability]);

  return (
    <div className={styles.downloadArea} aria-live="polite">
      <button
        type="button"
        className={styles.downloadButton}
        onClick={() => void checkAvailability()}
        disabled={status === "checking" || status === "downloading"}
      >
        {status === "downloading"
          ? "다운로드 시작 중…"
          : "Android APK 다운로드"}
      </button>
      <p className={styles.status}>
        {status === "checking" && "최신 APK를 확인하고 있습니다…"}
        {status === "preparing" &&
          "최신 APK를 준비 중입니다. 완료되면 자동으로 다운로드됩니다."}
        {status === "downloading" && "다운로드를 시작했습니다."}
        {status === "error" &&
          "상태를 확인하지 못했습니다. 잠시 후 위 버튼을 다시 눌러 주세요."}
      </p>
    </div>
  );
}
