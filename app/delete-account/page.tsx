import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "계정 삭제 안내 | 오늘어디",
  description: "오늘어디 계정 및 관련 데이터 삭제 방법을 안내합니다.",
};

export default function DeleteAccountPage() {
  return (
    <main className="legal-page">
      <article className="legal-shell">
        <header className="legal-header">
          <a href="/">← 오늘어디 홈</a>
          <small>ACCOUNT DELETION</small>
          <h1>오늘어디 계정 삭제 안내</h1>
          <p>Google Play 이용자를 위한 계정 및 관련 데이터 삭제 안내입니다.</p>
        </header>

        <div className="legal-content">
          <section>
            <h2>1. 앱에서 계정 삭제</h2>
            <p>
              오늘어디에 로그인한 뒤 <strong>내 계정 → 회원탈퇴</strong>를 선택하고,
              안내에 따라 <strong>회원탈퇴</strong>를 입력하면 계정을 삭제할 수 있습니다.
            </p>
          </section>

          <section>
            <h2>2. 삭제되는 데이터</h2>
            <ul>
              <li>회원 프로필 및 계정 식별정보</li>
              <li>저장한 장소와 최근 본 장소</li>
              <li>추천 기록 및 계정과 연결된 서비스 이용정보</li>
            </ul>
            <p>연결된 Google, 카카오, 네이버 계정 자체는 삭제되지 않습니다.</p>
          </section>

          <section>
            <h2>3. 별도 보관될 수 있는 데이터</h2>
            <p>
              관계 법령상 보존 의무가 있거나 분쟁·보안 대응을 위해 필요한 정보는 해당 목적과
              법정 보존기간 동안 분리 보관한 후 삭제할 수 있습니다. 서비스 개선 데이터는 정책에
              따라 최대 90일, 고객지원 기록은 문의 종결일부터 1년 등 개인정보처리방침에 명시된
              기간이 적용될 수 있습니다.
            </p>
          </section>

          <section>
            <h2>4. 웹에서 삭제하려는 경우</h2>
            <p>
              아래 계정 설정 페이지에서 로그인 후 회원탈퇴를 진행할 수 있습니다.
            </p>
            <p><a href="/account">계정 설정에서 회원탈퇴하기</a></p>
          </section>

          <section>
            <h2>5. 개인정보처리방침</h2>
            <p>
              데이터 처리 및 보유기간에 대한 자세한 내용은 <a href="/privacy">개인정보처리방침</a>에서 확인할 수 있습니다.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
