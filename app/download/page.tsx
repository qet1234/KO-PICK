import type { Metadata } from "next";
import Image from "next/image";
import styles from "./download.module.css";

const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.koreapick.app";

export const metadata: Metadata = {
  title: "오늘어디 앱 설치",
  description: "오늘어디 Android 앱은 Google Play에서 설치합니다.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DownloadPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="download-title">
        <Image className={styles.logo} src="/brand-mark.svg" alt="" width={64} height={64} priority />
        <p className={styles.eyebrow}>오늘어디 · GOOGLE PLAY</p>
        <h1 id="download-title">오늘어디 앱 설치</h1>
        <p className={styles.description}>
          Android 앱은 Google Play에서만 설치하고 업데이트할 수 있습니다.
          외부 APK 직접 다운로드는 종료되었습니다.
        </p>

        <div className={styles.downloadArea}>
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
        </div>

        <div className={styles.notice}>
          <strong>Android 설치 안내</strong>
          <p>
            ‘출처를 알 수 없는 앱 설치’ 권한을 허용하지 마세요. 기존 외부 APK에서
            Google Play 버전으로 전환할 때 업데이트가 되지 않으면 기존 앱을 삭제한 뒤
            Google Play에서 다시 설치해 주세요.
          </p>
        </div>
      </section>
    </main>
  );
}
