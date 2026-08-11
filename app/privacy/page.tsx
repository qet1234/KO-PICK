import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 오늘어디",
  description: "오늘어디의 개인정보 처리, 국외 이전, 보유·삭제 및 이용자 권리를 안내합니다.",
};

const effectiveDate = "2026년 8월 11일";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <article className="legal-shell">
        <header className="legal-header">
          <a href="/">← 오늘어디 홈</a>
          <small>PRIVACY POLICY</small>
          <h1>개인정보처리방침</h1>
          <p>시행일 {effectiveDate} · 웹, Android 및 iOS 앱에 공통 적용</p>
        </header>

        <div className="legal-content">
          <p className="legal-note">
            오늘어디는 비회원에게도 장소 탐색 등 핵심 기능을 제공합니다. 회원 기능을 선택한 경우와
            이용자가 직접 허용하거나 제출한 경우에 한해 필요한 정보를 처리합니다. 개인정보를 판매하지
            않으며 광고 목적의 교차 앱 추적, 광고 식별자, 정밀 위치, 연락처, 사진, 카메라 또는 마이크 정보를 수집하지 않습니다.
          </p>

          <section>
            <h2>1. 개인정보의 처리 목적·항목·근거·기간</h2>
            <div className="legal-table-wrap">
              <table>
                <thead><tr><th>구분</th><th>처리 항목</th><th>목적·처리 근거</th><th>보유기간</th></tr></thead>
                <tbody>
                  <tr>
                    <td>회원 계정</td>
                    <td>로그인 제공자, 제공자 고유 식별자, 이메일, 이름·닉네임, 프로필 이미지(제공된 경우)</td>
                    <td>회원 식별, 로그인, 저장·최근 기록 동기화, 계정 관리 · 필수 동의 및 서비스 계약 이행</td>
                    <td>회원탈퇴 시까지</td>
                  </tr>
                  <tr>
                    <td>필수 동의 기록</td>
                    <td>회원 식별자, 약관·방침 버전, 동의 시각, 로그인 제공자</td>
                    <td>만 14세 이상 확인 및 필수 동의 사실 증명 · 동의 및 법적 의무 이행</td>
                    <td>회원탈퇴 시까지. 분쟁이 발생하면 관계 법령상 필요한 기간</td>
                  </tr>
                  <tr>
                    <td>서비스 개선 데이터(선택)</td>
                    <td>무작위 방문자 UUID, 검색 조건, 검색 결과 없음, 장소 조회·지도·길찾기·예약·저장 이벤트, 화면 경로, 기기 플랫폼, 로그인 여부, API 응답시간·상태코드, 앱 오류 메시지</td>
                    <td>검색·추천 품질, 이용 흐름, 장애·성능 개선 · 선택 동의</td>
                    <td>생성일부터 90일. 동의 철회 시 해당 UUID의 기록 삭제 요청</td>
                  </tr>
                  <tr>
                    <td>장소 정보 신고</td>
                    <td>무작위 방문자 UUID, 회원 식별자(로그인 시), 공개 장소 ID·명칭·주소·카테고리, 신고 사유·설명, 처리 상태</td>
                    <td>폐업·위치·정보 오류 확인과 수정 · 이용자 요청 처리</td>
                    <td>처리 완료일부터 1년</td>
                  </tr>
                  <tr>
                    <td>고객지원</td>
                    <td>발신 이메일, 문의 내용, 이용자가 선택한 첨부파일</td>
                    <td>권리 행사, 계정 삭제, 저작권·서비스 문의와 피드백 처리 · 이용자 요청 처리</td>
                    <td>문의 종결일부터 1년</td>
                  </tr>
                  <tr>
                    <td>공개 공유</td>
                    <td>무작위 공유 ID의 해시, 코스명·지역·소요시간, 공개 장소 정보, 만료·취소 시각</td>
                    <td>공유 링크 제공과 취소 · 이용자 요청에 따른 기능 제공</td>
                    <td>30일 후 비공개, 만료 후 7일 이내 삭제. 직접 취소 시 즉시 비공개</td>
                  </tr>
                  <tr>
                    <td>보안·접속 기록</td>
                    <td>IP 주소, 사용자 에이전트, 요청 시각, 인증·오류·보안 기록</td>
                    <td>서비스 보안, 장애 대응, 부정 이용 방지 · 안전한 서비스 제공</td>
                    <td>원칙적으로 90일. 보안사고 또는 법령상 보존이 필요한 경우 해당 기간</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>소셜 제공 항목은 이용자가 해당 제공자 화면에서 허용한 범위에 따라 달라집니다. 법령상 별도 보존 의무가 생기면 해당 정보만 분리해 법정 기간 보관합니다.</p>
          </section>

          <section>
            <h2>2. 선택 동의와 거부·철회</h2>
            <ul>
              <li>모바일 앱의 서비스 개선 데이터는 첫 실행 때 별도 선택을 받으며 기본값은 미동의입니다.</li>
              <li>허용하지 않아도 장소 탐색·추천·저장·지도·길찾기 등 필수 기능을 동일하게 이용할 수 있습니다.</li>
              <li>앱의 <strong>내 계정 → 서비스 개선 데이터</strong>에서 언제든 허용 또는 철회할 수 있습니다.</li>
              <li>철회하면 이후 수집을 즉시 중단하고 기기의 방문자 UUID를 삭제하며, 해당 UUID로 저장된 서비스 개선 기록의 삭제를 요청합니다. 삭제 요청이 일시적으로 실패한 기록도 생성일부터 90일 뒤 자동 삭제됩니다.</li>
              <li>장소 오류 신고, 로그인, 저장 등 이용자가 직접 요청한 기능의 필수 처리는 선택 동의와 별개입니다.</li>
            </ul>
          </section>

          <section>
            <h2>3. 수집 방법과 기기 내 저장</h2>
            <ul>
              <li>소셜 로그인 제공자 화면, 이용자가 직접 입력·제출한 내용, 앱·웹 이용 과정에서 생성된 기록으로 수집합니다.</li>
              <li>모바일 앱은 저장·최근 장소, 추천 성향, 선호 지도, 임시 캐시와 동의 설정을 기기에 저장합니다. 로그인한 경우 저장·최근 장소는 서버와 동기화될 수 있습니다.</li>
              <li>무작위 UUID는 광고 식별자가 아니며 이름·이메일·정밀 위치를 포함하지 않습니다.</li>
              <li>공개 공유 링크에는 계정, 이메일, 닉네임, 개인 메모를 넣지 않으며 원본 공유 ID 대신 일방향 해시만 서버에 저장합니다.</li>
            </ul>
          </section>

          <section>
            <h2>4. 제3자 제공과 외부 서비스</h2>
            <p>오늘어디는 개인정보를 판매하지 않으며, 이용자 동의 또는 법령상 근거 없이 개인정보를 제3자에게 제공하지 않습니다.</p>
            <p>
              네이버 지도·예약, 카카오맵 등 외부 서비스로 이동하면 장소명·주소·공개 좌표가 검색 또는 길찾기 정보로 전달될 수 있고 해당 사업자의 약관과 개인정보처리방침이 적용됩니다.
              오늘어디는 외부 예약·결제의 당사자가 아닙니다.
            </p>
          </section>

          <section>
            <h2>5. 개인정보 처리업무 위탁</h2>
            <div className="legal-table-wrap">
              <table>
                <thead><tr><th>수탁자</th><th>위탁 업무</th><th>처리 정보·보유 기준</th></tr></thead>
                <tbody>
                  <tr>
                    <td>Vercel Inc.<br /><a href="mailto:privacy@vercel.com">privacy@vercel.com</a></td>
                    <td>웹 호스팅, CDN, 보안·장애 대응</td>
                    <td>IP 주소, 사용자 에이전트, 요청·쿠키 정보 · 위탁계약 또는 제공사 로그 보유기간까지</td>
                  </tr>
                  <tr>
                    <td>Supabase Inc.<br /><a href="mailto:privacy@supabase.com">privacy@supabase.com</a></td>
                    <td>회원 인증, 데이터베이스, 서버리스 API</td>
                    <td>회원·동의·저장·활동·신고·공유 데이터 · 제1조의 항목별 보유기간까지</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>오늘어디는 위탁계약과 접근 통제를 통해 목적 외 처리 금지, 보호조치, 재위탁 및 종료 시 삭제 의무를 관리합니다.</p>
          </section>

          <section>
            <h2>6. 국외 이전 및 선택형 외부 로그인</h2>
            <p>
              아래 서비스는 기능을 제공하는 과정에서 암호화된 네트워크를 통해 국외에서 정보를 처리할 수 있습니다.
              이전을 원하지 않으면 Google·Apple 로그인이나 Gmail 문의를 사용하지 않고 카카오·네이버 로그인 또는 비회원 탐색을 선택할 수 있습니다.
            </p>
            <div className="legal-table-wrap">
              <table>
                <thead><tr><th>이전받는 자·연락처</th><th>항목·목적</th><th>국가·시점·방법</th><th>근거·보유기간·거부 영향</th></tr></thead>
                <tbody>
                  <tr>
                    <td>Vercel Inc.<br /><a href="mailto:privacy@vercel.com">privacy@vercel.com</a></td>
                    <td>IP, 사용자 에이전트, 요청·쿠키 정보 · 호스팅·보안</td>
                    <td>미국 및 글로벌 CDN 처리 지역 · 웹 요청 시 TLS 전송</td>
                    <td>계약 이행에 필요한 처리위탁 · 계약 또는 로그 보유기간까지 · 거부 시 웹 이용 불가</td>
                  </tr>
                  <tr>
                    <td>Supabase Inc.<br /><a href="mailto:privacy@supabase.com">privacy@supabase.com</a></td>
                    <td>제1조의 회원·동의·저장·활동·신고·공유 정보 · 인증·DB·API</td>
                    <td>운영 프로젝트 선택 리전 및 미국의 지원·제어 처리 환경 · 기능 이용 시 TLS 전송</td>
                    <td>계약 이행에 필요한 처리위탁 · 제1조의 보유기간까지 · 거부 시 회원·서버 기능 이용 불가</td>
                  </tr>
                  <tr>
                    <td>Google LLC<br /><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">개인정보처리방침</a></td>
                    <td>로그인 요청, 제공자 고유 식별자·이메일·이름·프로필(제공된 경우) · 선택한 Google 로그인</td>
                    <td>미국 등 Google 운영 지역 · Google 로그인 선택 시 OAuth TLS 전송</td>
                    <td>이용자 동의 및 계약 이행 · 회원탈퇴 또는 연동 해제 시까지 · 다른 로그인이나 비회원 이용 가능</td>
                  </tr>
                  <tr>
                    <td>Google LLC (Gmail)<br /><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">개인정보처리방침</a></td>
                    <td>발신 이메일, 문의 내용, 이용자가 첨부한 파일 · 문의 접수와 회신</td>
                    <td>미국 등 Google 운영 지역 · 이용자가 Gmail에서 보내기를 누를 때 TLS 전송</td>
                    <td>이용자 요청 처리 · 문의 종결일부터 1년 · 이메일 문의를 보내지 않거나 최소 정보만 기재</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              iOS에서 이용자가 <strong>Apple로 로그인</strong>을 선택하면 로그인 요청, Apple 고유 식별자와 이용자가 공개한 이메일·이름이
              미국 등 Apple 운영 지역에서 TLS로 처리될 수 있습니다. 처리 근거는 이용자 동의와 로그인 계약 이행이며, 회원탈퇴 또는
              연동 해제 시까지 처리됩니다. Apple 로그인을 거부해도 다른 로그인이나 비회원 탐색을 이용할 수 있습니다. 탈퇴 시에는
              연결 해제를 위해 일회성 승인 코드를 Apple에 전송할 수 있습니다. 자세한 내용은 <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noreferrer">Apple 개인정보처리방침</a>에서 확인할 수 있습니다.
            </p>
            <p className="legal-note">
              Supabase 고객 데이터의 정확한 저장 국가는 운영 프로젝트의 선택 리전입니다. 운영자는 출시 전 Supabase 대시보드의 실제 리전을 확인해 이 항목에 국가명을 명시하고, 변경 시 사전에 방침을 갱신합니다.
            </p>
          </section>

          <section>
            <h2>7. 쿠키와 자동 수집 거부</h2>
            <div className="legal-table-wrap">
              <table>
                <thead><tr><th>이름·유형</th><th>목적</th><th>기간</th></tr></thead>
                <tbody>
                  <tr><td>Supabase 인증 쿠키</td><td>로그인 상태 유지와 보안 세션 갱신</td><td>세션 또는 토큰 만료 시까지</td></tr>
                  <tr><td>kopick_legal_consent</td><td>로그인 직전 필수 동의의 위변조 방지 확인</td><td>15분</td></tr>
                  <tr><td>todaywhere_ops_visitor</td><td>웹 서비스 품질·오류 기록의 무작위 구분</td><td>90일</td></tr>
                  <tr><td>todaywhere_visitor</td><td>실시간 인기 장소·검색어의 중복 방지용 무작위 구분</td><td>90일</td></tr>
                </tbody>
              </table>
            </div>
            <p>브라우저 설정에서 쿠키 저장을 차단하거나 삭제할 수 있습니다. 필수 인증 쿠키를 차단하면 로그인과 회원 기능이 제한되지만 비회원 탐색은 이용할 수 있습니다.</p>
          </section>

          <section>
            <h2>8. 파기 절차와 방법</h2>
            <ul>
              <li>보유기간 종료 또는 목적 달성 시 지체 없이 삭제하고, 전자 파일은 복구하기 어려운 방식으로 파기합니다.</li>
              <li>회원탈퇴 시 계정과 회원에 연결된 저장·최근·동의 데이터를 삭제합니다. 앱의 저장 장소·최근 장소·선호 지도·방문자 UUID·동의 설정도 함께 삭제합니다.</li>
              <li>Apple 로그인 회원은 탈퇴 과정에서 Apple 연결 토큰 해제를 시도하며 자동 해제가 불가능하면 수동 해제 방법을 안내합니다.</li>
              <li>백업 사본은 운영상 즉시 분리하고 백업 순환 주기에 따라 삭제하며, 복구 목적 외에는 사용하지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2>9. 이용자의 권리와 행사 방법</h2>
            <p>이용자는 개인정보 열람·정정·삭제·처리정지·동의 철회를 요구할 수 있고, 대리인을 통해서도 행사할 수 있습니다. 본인 확인에 필요한 최소 정보만 요청하며 지체 없이 처리 결과를 안내합니다.</p>
            <div className="legal-actions">
              <a href="/account">계정 설정</a>
              <a href="/account-deletion">계정·데이터 삭제</a>
              <a href="/support">권리 행사 접수</a>
            </div>
          </section>

          <section>
            <h2>10. 자동화된 결정과 맞춤 추천</h2>
            <p>검색 조건, 날씨, 인기도 등을 이용해 장소 표시 순서를 자동 조정할 수 있으나 법적 효력이나 이용자 권리에 중대한 영향을 주는 자동화된 결정을 하지 않습니다. 이용자는 추천 결과와 무관하게 지도·목록·이름순 보기로 장소를 직접 탐색할 수 있습니다.</p>
          </section>

          <section>
            <h2>11. 만 14세 미만 이용자</h2>
            <p>회원 서비스는 만 14세 이상을 대상으로 하며 생년월일은 수집하지 않습니다. 가입 시 만 14세 이상임을 필수로 확인합니다. 만 14세 미만의 가입 사실을 알게 되면 계정과 개인정보를 지체 없이 삭제합니다.</p>
          </section>

          <section>
            <h2>12. 안전성 확보 조치</h2>
            <ul>
              <li>HTTPS 전송 암호화, 보안 헤더, 서버 비밀키와 공개 앱 키의 분리</li>
              <li>Supabase Row Level Security와 회원별 최소 권한 접근 통제</li>
              <li>요청 빈도 제한, 오류 데이터 최소화, 90일 자동 삭제 정책</li>
              <li>의존성·데이터베이스 정책 점검과 계정 삭제 절차 검증</li>
            </ul>
          </section>

          <section>
            <h2>13. 개인정보 보호 담당과 구제기관</h2>
            <p>
              담당 부서: 오늘어디 개인정보 보호 담당<br />
              이메일: <a href="mailto:jjs092200@gmail.com">jjs092200@gmail.com</a><br />
              접수: <a href="/support">오늘어디 고객지원</a>
            </p>
            <p>개인정보 침해 상담은 개인정보침해신고센터(국번 없이 118), 개인정보분쟁조정위원회(1833-6972), 경찰청(182) 등 관계 기관에 문의할 수 있습니다.</p>
          </section>

          <section>
            <h2>14. 방침 변경</h2>
            <p>중요한 변경은 시행일 최소 7일 전에 공지하고 이용자 권리에 중대한 변경은 최소 30일 전에 알립니다.</p>
            <p>
              본 방침은 개인정보보호위원회의 <a href="https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&amp;mCode=D010030000&amp;nttId=12018" target="_blank" rel="noreferrer">개인정보 처리방침 작성지침(2026.4 개정)</a>을 참고했습니다.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
