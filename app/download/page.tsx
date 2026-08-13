import type { Metadata } from "next";
import Image from "next/image";
import DownloadLauncher from "./DownloadLauncher";
import styles from "./download.module.css";

export const metadata: Metadata = {
  title: "오늘어디 앱 다운로드",
  description: "오늘어디 Android 최신 APK와 iPhone 홈 화면 앱을 설치합니다.",
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
          이 페이지는 항상 현재 배포 중인 최신 Android APK로 연결됩니다. 기존에
          오늘어디를 설치한 경우 앱을 삭제하지 말고 최신 APK를 받아 업데이트 설치하면
          됩니다. 일반 화면·기능 수정은 호환되는 경우 앱 실행 시 자동 업데이트됩니다.
        </p>

        <DownloadLauncher />

        <div className={styles.notice}>
          <strong>설치 전에 확인해 주세요</strong>
          <p>
            Android는 보안 안내가 표시되면 브라우저의 ‘출처를 알 수 없는 앱
            설치’ 권한을 허용해 주세요. 기존 앱과 동일한 서명인 경우 사용자 데이터는
            유지한 채 덮어쓰기 업데이트할 수 있습니다. iPhone은 APK나 IPA 직접
            다운로드가 아니라 Safari의 ‘홈 화면에 추가’ 기능으로 설치합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
