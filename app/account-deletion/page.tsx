import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "계정 삭제 안내 | 오늘어디",
  description: "오늘어디 계정과 개인정보 삭제 방법을 안내합니다.",
};

export default function AccountDeletionPage() {
  return (
    <main className="legal-page">
      <article className="legal-shell">
        <header className="legal-header">
          <a href="/">← 오늘어디 홈</a>
          <small>ACCOUNT DELETION</small>
          <h1>계정·데이터 삭제</h1>
          <p>앱 내부 삭제와 외부 웹 삭제 요청에 공통으로 사용하는 공식 안내 페이지입니다.</p>
        </header>
        <div className="legal-content">
          <section>
            <h2>직접 삭제하는 방법</h2>
            <ol>
              <li>오늘어디 앱 또는 웹에 로그인합니다.</li>
              <li>앱은 <strong>내 계정 → 회원탈퇴</strong>, 웹은 <a href="/account">계정 설정</a>으로 이동합니다.</li>
              <li>회원탈퇴를 누르고 확인 문구 <strong>회원탈퇴</strong>를 입력합니다.</li>
              <li>영구 탈퇴를 누르면 계정과 연결 데이터의 삭제가 시작되고 완료 결과가 화면에 표시됩니다.</li>
            </ol>
            <div className="legal-actions"><a href="/account">계정 설정에서 삭제</a></div>
          </section>
          <section>
            <h2>삭제되는 정보</h2>
            <ul>
              <li>소셜 로그인 계정 식별자, 이메일, 닉네임, 프로필 이미지</li>
              <li>저장한 장소, 최근 본 장소, 본인이 만든 투표와 필수 동의 기록</li>
              <li>이 기기의 방문자 식별자에 연결된 검색·장소 활동</li>
              <li>앱·브라우저에 저장된 추천 성향, 저장·최근 장소, 선호 지도, 임시 캐시와 서비스 개선 동의 설정</li>
            </ul>
            <p>처리 완료된 장소 오류 신고와 종결된 고객지원 메일은 분쟁 대응과 처리 이력 확인을 위해 각각 정해진 보유기간까지 분리 보관한 뒤 삭제될 수 있습니다. 법령상 보존 의무가 있는 정보도 해당 기간만 보관합니다.</p>
          </section>
          <section>
            <h2>로그인할 수 없는 경우</h2>
            <p>고객지원에 사용한 소셜 제공자와 계정 식별에 필요한 최소 정보를 보내 주세요. 추가 정보는 꼭 필요한 경우에만 요청하며, 본인 확인 후 지체 없이 삭제를 처리하고 결과를 회신합니다. 확인용 정보는 처리 완료 후 삭제합니다.</p>
            <div className="legal-actions">
              <a href="/support?category=account-deletion">외부 삭제 요청</a>
            </div>
          </section>
          <section>
            <h2>유의사항</h2>
            <p className="legal-note legal-danger">삭제된 계정과 개인 데이터는 복구할 수 없습니다. Google·카카오·네이버 계정 자체는 삭제되지 않으며 오늘어디와의 연결만 해제됩니다.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
