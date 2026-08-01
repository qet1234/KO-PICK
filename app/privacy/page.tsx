import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 코리아픽",
  description: "코리아픽이 처리하는 개인정보와 보호 조치를 안내합니다.",
};

const effectiveDate = "2026년 7월 31일";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <article className="legal-shell">
        <header className="legal-header">
          <a href="/">← 코리아픽 홈</a>
          <small>PRIVACY POLICY</small>
          <h1>개인정보처리방침</h1>
          <p>시행일 {effectiveDate} · 현재 운영 기능과 데이터 흐름을 기준으로 작성했습니다.</p>
        </header>
        <div className="legal-content">
          <p className="legal-note">
            코리아픽은 회원 식별과 함께 공간 제공에 필요한 정보만 처리합니다.
            현재 위치의 정밀 좌표는 수집하거나 서버에 저장하지 않습니다.
          </p>

          <section>
            <h2>1. 처리 목적·항목·보유기간</h2>
            <div className="legal-table-wrap">
              <table>
                <thead><tr><th>구분</th><th>처리 항목</th><th>목적</th><th>보유기간</th></tr></thead>
                <tbody>
                  <tr>
                    <td>소셜 로그인</td>
                    <td>소셜 제공자, 제공자 내 고유 식별자, 이메일, 닉네임, 프로필 이미지</td>
                    <td>회원 식별, 로그인, 계정 관리</td>
                    <td>회원탈퇴 시까지</td>
                  </tr>
                  <tr>
                    <td>함께 공간</td>
                    <td>공간 유형·이름, 구성원·닉네임·역할, 일정·기념일·예약 계획·투표</td>
                    <td>개인·커플·친구·가족 협업 기능 제공</td>
                    <td>이용자가 삭제하거나 회원탈퇴할 때까지. 다른 구성원이 있는 공간은 소유권 이전 후 탈퇴자 정보만 삭제</td>
                  </tr>
                  <tr>
                    <td>추천·이용 활동</td>
                    <td>무작위 방문자 식별자, 검색어, 장소 조회·상세·외부 이동·찜 이벤트, 생성 시각</td>
                    <td>실시간 인기 장소·검색어 산정, 서비스 품질 개선</td>
                    <td>생성일부터 90일</td>
                  </tr>
                  <tr>
                    <td>기기 저장정보</td>
                    <td>추천 성향, 저장한 장소, 선호 지도, 임시 장소 캐시</td>
                    <td>개인화와 화면 편의 제공</td>
                    <td>브라우저에서 삭제하거나 회원탈퇴할 때까지</td>
                  </tr>
                  <tr>
                    <td>보안·접속 기록</td>
                    <td>IP 주소, 사용자 에이전트, 요청 시각, 오류·보안 이벤트</td>
                    <td>장애 대응, 부정 이용 방지, 보안</td>
                    <td>원칙적으로 90일. 법령상 보존 또는 보안사고 대응이 필요한 경우 해당 기간</td>
                  </tr>
                  <tr>
                    <td>고객지원</td>
                    <td>문의·피드백 유형, 발신 이메일, 문의·피드백 내용, 처리 상태</td>
                    <td>권리 행사, 계정 삭제, 저작권·서비스 문의 및 테스트 피드백 처리</td>
                    <td>문의 종결일부터 1년</td>
                  </tr>
                  <tr>
                    <td>필수 동의 기록</td>
                    <td>회원 식별자, 동의 문서 종류·버전, 동의 시각, 로그인 제공자</td>
                    <td>이용약관·개인정보 수집·이용 동의 사실 확인</td>
                    <td>회원탈퇴 또는 동의 철회 시까지. 법적 분쟁이 있으면 관계 법령상 필요한 기간</td>
                  </tr>
                  <tr>
                    <td>공개 코스 공유</td>
                    <td>무작위 공유 ID의 해시, 코스명·지역·소요시간, 공개 장소명·주소·카테고리, 만료·취소 시각</td>
                    <td>카카오톡·링크로 동일한 코스 열기, 공유 취소</td>
                    <td>30일 후 비공개, 만료 후 7일 이내 삭제. 소유자가 취소하면 즉시 비공개</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              소셜 제공자가 실제로 제공하는 항목은 이용자가 해당 제공자 화면에서 허용한 범위에 따라 달라집니다.
              법령상 별도 보존 의무가 발생하면 해당 정보만 다른 정보와 분리하여 법정 기간 보관합니다.
            </p>
          </section>

          <section>
            <h2>2. 처리 근거와 수집 방법</h2>
            <ul>
              <li>회원가입 화면에서 이용약관 동의와 개인정보 수집·이용 동의를 각각 받은 뒤 문서 버전과 동의 시각을 기록합니다.</li>
              <li>Google·카카오·네이버 소셜 로그인 과정과 이용자가 서비스에 직접 입력한 내용으로 수집합니다.</li>
              <li>검색·장소 이용 활동은 서비스 이용 중 자동 생성됩니다. 방문자 식별자는 광고 식별자가 아닌 무작위 UUID입니다.</li>
              <li>동의를 거부할 수 있으나 회원 전용 저장·함께 공간 기능은 사용할 수 없습니다. 비회원 장소 탐색은 계속 이용할 수 있습니다.</li>
              <li>공개 코스에는 계정·이메일·닉네임·관계·방문일·기념일·메모·투표자·예약정보를 넣지 않습니다. 원본 공유 ID 대신 일방향 해시만 서버에 저장합니다.</li>
            </ul>
          </section>

          <section>
            <h2>3. 제3자 제공과 외부 서비스</h2>
            <p>코리아픽은 개인정보를 판매하지 않으며, 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.</p>
            <p>
              네이버 지도·예약 또는 카카오맵으로 이동하면 해당 제공사의 서비스와 개인정보처리방침이 적용됩니다.
              외부 이동 전에 장소명과 주소가 검색어로 전달될 수 있습니다.
            </p>
          </section>

          <section>
            <h2>4. 처리위탁 및 국외 이전</h2>
            <div className="legal-table-wrap">
              <table>
                <thead><tr><th>수탁자·연락처</th><th>이전 항목·목적</th><th>국가·시점·방법</th><th>근거·보유기간·거부 방법</th></tr></thead>
                <tbody>
                  <tr>
                    <td>Vercel Inc.<br /><a href="mailto:privacy@vercel.com">privacy@vercel.com</a></td>
                    <td>IP 주소, 사용자 에이전트, 요청 시각, 전송되는 페이지 요청·쿠키 · 웹 호스팅, CDN, 보안·장애 대응</td>
                    <td>미국 및 글로벌 CDN 처리 지역 · 서비스 요청 때 TLS 암호화 네트워크 전송</td>
                    <td>개인정보 보호법 제28조의8 제1항 제3호(계약 이행에 필요한 처리위탁) · 위탁계약 종료 또는 제공사 로그 보관기간까지 · 거부 시 웹 서비스 이용 불가</td>
                  </tr>
                  <tr>
                    <td>Supabase Inc.<br /><a href="mailto:privacy@supabase.com">privacy@supabase.com</a></td>
                    <td>회원 식별자·이메일·닉네임·프로필 이미지, 함께 공간·추천 활동·지원 요청·공유 코스 데이터 · 인증, 데이터베이스, 서버리스 API</td>
                    <td>운영 프로젝트가 배치된 리전 및 미국의 지원·제어 처리 환경 · 가입·로그인·기능 이용 때 TLS 암호화 네트워크 전송</td>
                    <td>개인정보 보호법 제28조의8 제1항 제3호 · 회원탈퇴 또는 위탁계약 종료 시까지, 활동기록 90일, 공유 코스 30일+삭제 유예 7일 · 거부 시 회원 기능 이용 불가</td>
                  </tr>
                  <tr>
                    <td>Google LLC<br /><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google 개인정보처리방침</a></td>
                    <td>로그인 요청 정보와 Google이 KO-PICK에 제공하는 고유 식별자·이메일·닉네임·프로필 이미지 · Google 소셜 로그인</td>
                    <td>미국 등 Google 운영 지역 · 이용자가 Google 로그인을 선택할 때 OAuth 암호화 전송</td>
                    <td>이용자 동의 및 로그인 계약 이행 · Google 정책 및 연동 해제 시까지 · 거부 시 Google 로그인 대신 카카오·네이버 로그인 또는 비회원 탐색 이용</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              카카오·네이버 로그인은 국내 사업자의 인증 경로를 사용합니다. 국외 이전을 원하지 않으면
              소셜 로그인과 회원 기능을 사용하지 않고 비회원 장소 탐색을 이용할 수 있습니다.
              Supabase의 정확한 고객 데이터 저장 리전은 운영 프로젝트 설정을 기준으로 하며, 리전이나 수탁자가 변경되면 본 방침을 사전에 갱신합니다.
            </p>
          </section>

          <section>
            <h2>5. 파기 절차와 방법</h2>
            <ul>
              <li>보유기간이 끝나거나 목적이 달성된 개인정보는 지체 없이 삭제합니다.</li>
              <li>전자 파일은 복구하기 어려운 방식으로 삭제하며, 백업 사본은 백업 순환 주기에 따라 삭제됩니다.</li>
              <li>회원탈퇴 시 다른 구성원이 있는 함께 공간은 소유권을 이전하고 탈퇴자의 구성원 정보와 개인 데이터를 삭제합니다.</li>
              <li>이 기기의 방문자 UUID·추천 성향·저장 장소·선호 지도·임시 캐시도 함께 삭제합니다.</li>
            </ul>
          </section>

          <section>
            <h2>6. 이용자의 권리와 행사 방법</h2>
            <p>
              이용자는 개인정보 열람·정정·삭제·처리정지·동의 철회를 요구할 수 있습니다.
              계정 설정에서 직접 탈퇴하거나 아래 고객지원 채널로 요청할 수 있습니다.
            </p>
            <div className="legal-actions">
              <a href="/account">계정 설정</a>
              <a href="/account-deletion">계정 삭제 안내</a>
              <a href="/support">지원 요청</a>
            </div>
          </section>

          <section>
            <h2>7. 안전성 확보 조치</h2>
            <ul>
              <li>HTTPS 전송 암호화, 보안 헤더와 접근권한 최소화</li>
              <li>Supabase Row Level Security와 회원별·공간별 접근 통제</li>
              <li>서버 전용 비밀키 분리, API 요청 제한, 초대코드 해시 저장과 만료</li>
              <li>의존성 보안 점검, 데이터베이스 마이그레이션 검사, 계정 삭제 자동화</li>
            </ul>
          </section>

          <section>
            <h2>8. 개인정보 보호 담당</h2>
            <p>
              담당 부서: KO-PICK 개인정보 보호 담당<br />
              담당자 이메일: <a href="mailto:jjs092200@gmail.com">jjs092200@gmail.com</a><br />
              접수 방법: <a href="/support">KO-PICK 고객지원</a>의 문의 접수 또는 이메일(24시간 접수)
            </p>
            <p>
              개인정보 침해 상담은 개인정보침해신고센터(국번 없이 118),
              개인정보분쟁조정위원회(1833-6972) 등 관계 기관을 이용할 수 있습니다.
            </p>
          </section>

          <section>
            <h2>9. 방침 변경</h2>
            <p>
              중요한 내용이 변경되면 시행일 최소 7일 전 서비스에 공지하며,
              이용자 권리에 중대한 변경은 최소 30일 전에 알립니다.
            </p>
            <p>
              이 방침은 개인정보 보호법 및
              <a href="https://www.privacy.go.kr/front/bbs/bbsView.do?bbsNo=BBSMSTR_000000000049&bbscttNo=20885" target="_blank" rel="noreferrer"> 2026 개인정보 처리방침 작성지침</a>을 참고했습니다.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
