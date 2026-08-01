"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./download.module.css";

type DownloadLauncherProps = {
  apkUrl: string;
};

const AUTO_DOWNLOAD_DELAY_MS = 900;
const FALLBACK_MESSAGE_DELAY_MS = 4500;

export default function DownloadLauncher({ apkUrl }: DownloadLauncherProps) {
  const [status, setStatus] = useState<"waiting" | "downloading" | "fallback">(
    "waiting",
  );
  const hasStarted = useRef(false);

  const startDownload = useCallback(() => {
    if (hasStarted.current) return;

    hasStarted.current = true;
    setStatus("downloading");
    window.location.assign(apkUrl);
  }, [apkUrl]);

  useEffect(() => {
    const downloadTimer = window.setTimeout(
      startDownload,
      AUTO_DOWNLOAD_DELAY_MS,
    );
    const fallbackTimer = window.setTimeout(() => {
      setStatus("fallback");
    }, FALLBACK_MESSAGE_DELAY_MS);

    return () => {
      window.clearTimeout(downloadTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, [startDownload]);

  return (
    <div className={styles.downloadArea} aria-live="polite">
      <a
        className={styles.downloadButton}
        href={apkUrl}
        onClick={startDownload}
      >
        Android APK 다운로드
      </a>
      <p className={styles.status}>
        {status === "waiting" && "다운로드를 준비하고 있습니다…"}
        {status === "downloading" && "다운로드를 시작했습니다."}
        {status === "fallback" &&
          "자동으로 시작되지 않았다면 위 버튼을 눌러 주세요."}
      </p>
    </div>
  );
}
