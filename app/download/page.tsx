import type { Metadata } from "next";
import Image from "next/image";
import DownloadLauncher from "./DownloadLauncher";
import styles from "./download.module.css";

export const metadata: Metadata = {
  title: "오늘어디 앱 다운로드",
  description: "오늘어디 Android APK와 iPhone 홈 화면 앱을 설치합니다.",
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
        <p className={styles.eyebrow}>오늘어디 · ANDROID · iPhone</p>
        <h1 id="download-title">오늘어디 앱 다운로드</h1>
        <p className={styles.description}>
          Android는 APK를 직접 다운로드하고, iPhone은 Safari에서 홈 화면 앱으로
          설치해 사용할 수 있습니다.
        </p>

        <DownloadLauncher />

        <div className={styles.notice}>
          <strong>설치 전에 확인해 주세요</strong>
          <p>
            Android는 보안 안내가 표시되면 브라우저의 ‘출처를 알 수 없는 앱
            설치’ 권한을 허용해 주세요. iPhone은 APK나 IPA 직접 다운로드가 아니라
            Safari의 ‘홈 화면에 추가’ 기능으로 설치합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
