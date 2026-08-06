import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "데이터 출처·저작권 | 오늘어디",
  description: "오늘어디의 장소 데이터, 지도, 예약 링크와 오픈소스 출처를 안내합니다.",
};

export default function SourcesPage() {
  return (
    <main className="legal-page">
      <article className="legal-shell">
        <header className="legal-header">
          <a href="/">← 오늘어디 홈</a>
          <small>SOURCES &amp; COPYRIGHT</small>
          <h1>데이터 출처·저작권</h1>
          <p>장소 데이터와 외부 서비스의 역할을 명확히 구분합니다.</p>
        </header>
        <div className="legal-content">
          <section>
            <h2>한국관광공사 TourAPI</h2>
            <p>장소명, 주소, 좌표, 분류, 행사·관광 정보의 기본 원천은 한국관광공사 TourAPI입니다.</p>
            <ul>
              <li>제공기관: 한국관광공사</li>
              <li>공공데이터: 국문 관광정보 서비스 TourAPI 4.0</li>
              <li>오늘어디 추천 점수는 TourAPI 장소에 이용자가 선택한 조건을 적용한 자체 정렬 결과입니다.</li>
              <li>원천 데이터의 최신성·정확성은 제공기관 갱신 시점에 따라 달라질 수 있습니다.</li>
            </ul>
            <p>
              <a href="https://api.visitkorea.or.kr/" target="_blank" rel="noreferrer">TourAPI 공식 사이트</a>{" · "}
              <a href="https://www.data.go.kr/data/15101578/openapi.do" target="_blank" rel="noreferrer">공공데이터포털 상세</a>
            </p>
          </section>
          <section>
            <h2>사진 사용 원칙</h2>
            <p className="legal-note">대표 사진은 한국관광공사 TourAPI 이미지정보의 저작권 구분 코드가 공공누리 제1유형 또는 제3유형으로 확인된 경우에만 표시합니다.</p>
            <ul>
              <li>제1유형: 출처를 표시하고 카드·썸네일 크기에 맞춰 표시할 수 있습니다.</li>
              <li>제3유형: 변경 금지 조건에 따라 원본 비율을 유지하며 자르기·필터·확대 효과를 적용하지 않습니다.</li>
              <li>사진마다 “한국관광공사 TourAPI · 공공누리 유형”을 함께 표시합니다.</li>
              <li>저작권 유형을 확인할 수 없거나 이미지정보가 없는 장소는 오늘어디 자체 카테고리 일러스트를 표시합니다.</li>
              <li>TourAPI 사진은 기업 CI·BI 또는 피사체의 명예·인격권을 침해하는 용도로 사용하지 않습니다.</li>
            </ul>
            <p>
              <a href="https://www.kogl.or.kr/info/license.do" target="_blank" rel="noreferrer">공공누리 이용조건 확인</a>{" · "}
              <a href="https://www.data.go.kr/data/15101578/openapi.do" target="_blank" rel="noreferrer">TourAPI 데이터 상세</a>
            </p>
          </section>
          <section>
            <h2>Open-Meteo 날씨 예보</h2>
            <p>현재·시간대별·방문일 날씨 예보는 Open-Meteo API를 사용하며, 오늘어디는 강수확률 등에 따라 실내·야외 추천 순서를 자체 조정합니다.</p>
            <ul>
              <li>날씨 데이터 라이선스: Creative Commons Attribution 4.0 International (CC BY 4.0)</li>
              <li>현재 비상업 무료 운영 범위에서는 Open-Meteo free/open-access endpoint를 사용하며, 향후 상업화 전에는 해당 시점의 이용 플랜을 다시 검토합니다.</li>
              <li>예보는 실제 관측 및 현장 상황과 다를 수 있으므로 중요한 일정은 공식 기상정보를 함께 확인해 주세요.</li>
              <li>오늘어디가 날씨 데이터를 수정하는 경우 추천용 반올림·분류·문구 변환 범위로 한정합니다.</li>
            </ul>
            <p><a href="https://open-meteo.com/en/licence" target="_blank" rel="noreferrer">Open-Meteo 라이선스와 데이터 출처</a></p>
          </section>
          <section>
            <h2>지도와 예약</h2>
            <div className="legal-table-wrap">
              <table>
                <thead><tr><th>서비스</th><th>오늘어디에서의 역할</th><th>안내</th></tr></thead>
                <tbody>
                  <tr><td>NAVER Maps</td><td>지도 표시, 장소명·주소 기반 외부 지도 검색</td><td>네이버 상표·지도·외부 페이지의 권리는 네이버에 귀속</td></tr>
                  <tr><td>네이버 예약</td><td>TourAPI 장소와 명칭·주소가 일치하고 사전 검증된 경우 외부 예약 링크 제공</td><td>예약 가능 여부, 결제, 변경·취소는 네이버와 매장 정책 적용</td></tr>
                  <tr><td>카카오맵</td><td>이용자가 선택한 경우 외부 길찾기 링크 제공</td><td>장소 데이터를 수집·재판매하지 않음</td></tr>
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h2>오픈소스</h2>
            <p>Next.js, React, Supabase 클라이언트 등 오픈소스는 각 라이선스에 따라 사용합니다. 배포물의 상세 고지는 저장소의 <a href="https://github.com/qet1234/KO-PICK/blob/main/THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">THIRD_PARTY_NOTICES</a>에서 확인할 수 있습니다.</p>
          </section>
          <section>
            <h2>권리 침해 신고</h2>
            <p>권리자 이름, 대상 URL, 권리 근거, 요청사항을 고객지원에 보내면 확인 후 노출 중단·수정 등 필요한 조치를 진행합니다.</p>
            <div className="legal-actions"><a href="/support?category=copyright">권리 침해 신고</a></div>
          </section>
        </div>
      </article>
    </main>
  );
}
