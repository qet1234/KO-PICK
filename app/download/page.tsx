import type { Metadata } from "next";
import DownloadLauncher from "./DownloadLauncher";
import styles from "./download.module.css";

export const metadata: Metadata = {
  title: "코리아픽 앱 다운로드",
  description: "코리아픽 Android 앱과 iOS TestFlight 베타를 설치합니다.",
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
        <p className={styles.eyebrow}>KOREA PICK · ANDROID · iOS BETA</p>
        <h1 id="download-title">코리아픽 앱 다운로드</h1>
        <p className={styles.description}>
          접속한 기기를 확인해 Android는 APK 다운로드를, iPhone은 TestFlight
          설치 화면을 자동으로 엽니다.
        </p>

        <DownloadLauncher />

        <div className={styles.notice}>
          <strong>설치 전에 확인해 주세요</strong>
          <p>
            Android는 보안 안내가 표시되면 브라우저의 ‘출처를 알 수 없는 앱
            설치’ 권한을 허용해 주세요. iPhone은 무료 TestFlight 앱을 먼저
            설치한 뒤 코리아픽 베타에 참여할 수 있습니다.
          </p>
        </div>
      </section>
    </main>
  );
}
