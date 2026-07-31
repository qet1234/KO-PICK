import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "계정 삭제 안내 | 코리아픽",
  description: "코리아픽 계정과 개인정보 삭제 방법을 안내합니다.",
};

export default function AccountDeletionPage() {
  return (
    <main className="legal-page">
      <article className="legal-shell">
        <header className="legal-header">
          <a href="/">← 코리아픽 홈</a>
          <small>ACCOUNT DELETION</small>
          <h1>계정·데이터 삭제</h1>
          <p>앱 내부 삭제와 외부 웹 삭제 요청에 공통으로 사용하는 공식 안내 페이지입니다.</p>
        </header>
        <div className="legal-content">
          <section>
            <h2>직접 삭제하는 방법</h2>
            <ol>
              <li>코리아픽에 로그인합니다.</li>
              <li><a href="/account">계정 설정</a>으로 이동합니다.</li>
              <li>회원탈퇴를 누르고 확인 문구 <strong>회원탈퇴</strong>를 입력합니다.</li>
              <li>영구 탈퇴를 누르면 계정과 삭제 대상 데이터가 즉시 처리됩니다.</li>
            </ol>
            <div className="legal-actions"><a href="/account">계정 설정에서 삭제</a></div>
          </section>
          <section>
            <h2>삭제되는 정보</h2>
            <ul>
              <li>소셜 로그인 계정 식별자, 이메일, 닉네임, 프로필 이미지</li>
              <li>개인 공간, 개인 저장 데이터, 투표와 구성원 정보</li>
              <li>이 기기의 방문자 식별자에 연결된 검색·장소 활동</li>
              <li>브라우저에 저장된 추천 성향, 저장 장소, 선호 지도, 임시 캐시</li>
            </ul>
          </section>
          <section>
            <h2>다른 구성원이 있는 공간</h2>
            <p>회원탈퇴만으로 다른 구성원의 공유 데이터가 사라지지 않도록 공간 소유권을 가장 먼저 가입한 남은 구성원에게 이전한 뒤 탈퇴자 정보만 삭제합니다.</p>
          </section>
          <section>
            <h2>로그인할 수 없는 경우</h2>
            <p>고객지원에 사용한 소셜 제공자와 계정 식별에 필요한 최소 정보를 보내 주세요. 본인 확인 후 삭제를 처리하며, 확인에 필요한 정보는 처리 완료 후 삭제합니다.</p>
            <div className="legal-actions">
              <a href="/support?category=account-deletion">외부 삭제 요청</a>
            </div>
          </section>
          <section>
            <h2>유의사항</h2>
            <p className="legal-note legal-danger">삭제된 계정과 개인 데이터는 복구할 수 없습니다. Google·카카오·네이버 계정 자체는 삭제되지 않으며, 해당 제공자 계정의 연결 관리는 각 제공자 설정에서 별도로 할 수 있습니다.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
