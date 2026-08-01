import type { Metadata } from "next";
import Link from "next/link";
import DownloadLauncher from "./DownloadLauncher";
import styles from "./download.module.css";

const defaultAndroidApkUrl =
  "https://github.com/qet1234/KO-PICK/releases/download/android-latest/koreapick-latest.apk";

const androidApkUrl =
  process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim() || defaultAndroidApkUrl;

export const metadata: Metadata = {
  title: "코리아픽 앱 다운로드",
  description: "코리아픽 Android 앱 설치 파일을 다운로드합니다.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DownloadPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="download-title">
        <div className={styles.logo} aria-hidden="true">
          K
        </div>
        <p className={styles.eyebrow}>KOREA PICK · ANDROID</p>
        <h1 id="download-title">코리아픽 앱 다운로드</h1>
        <p className={styles.description}>
          잠시 후 최신 Android 설치 파일(APK) 다운로드가 자동으로 시작됩니다.
        </p>

        <DownloadLauncher apkUrl={androidApkUrl} />

        <div className={styles.notice}>
          <strong>설치 전에 확인해 주세요</strong>
          <p>
            Android 보안 안내가 표시되면 브라우저의 ‘출처를 알 수 없는 앱 설치’
            권한을 허용한 뒤 설치할 수 있습니다.
          </p>
        </div>

        <Link className={styles.homeLink} href="/">
          코리아픽 홈으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
