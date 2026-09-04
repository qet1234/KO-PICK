import type { Metadata } from "next";
import Image from "next/image";
import DownloadLauncher from "./DownloadLauncher";
import styles from "./download.module.css";

export const metadata: Metadata = {
  title: "오늘어디 앱 설치",
  description: "오늘어디 Android 앱은 Google Play에서 설치하고, iPhone은 홈 화면 앱으로 이용합니다.",
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
        <p className={styles.eyebrow}>오늘어디 · GOOGLE PLAY · iPhone</p>
        <h1 id="download-title">오늘어디 앱 설치</h1>
        <p className={styles.description}>
          Android 앱은 Google Play에서만 설치하고 업데이트할 수 있습니다.
          외부 APK 직접 다운로드는 종료되었습니다. iPhone에서는 Safari의 홈 화면
          앱으로 이용할 수 있습니다.
        </p>

        <DownloadLauncher />

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
