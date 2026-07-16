"use client";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import LiveKeywords from "@/components/LiveKeywords";
import LiveRecommendations from "@/components/LiveRecommendations";

const categories = [
  {
    code: "DINING",
    title: "맛집",
    description: "지역별 인기 다이닝",
  },
  {
    code: "CAFE",
    title: "카페",
    description: "분위기 좋은 카페",
  },
  {
    code: "TRAVEL",
    title: "여행지",
    description: "전국 여행 명소",
  },
  {
    code: "FESTIVAL",
    title: "축제",
    description: "지역별 행사 정보",
  },
  {
    code: "CULTURE",
    title: "문화",
    description: "전시와 문화생활",
  },
  {
    code: "COURSE",
    title: "추천 코스",
    description: "AI 맞춤 일정",
  },
];

const regions = [
  "서울",
  "경기",
  "인천",
  "부산",
  "제주",
  "강원",
  "충청",
  "전라",
  "경상",
  "대구",
  "광주",
  "대전",
];

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#top">
            <span className="brand-mark">K</span>
            <span>코리아픽</span>
          </a>

          <nav className="desktop-nav" aria-label="주요 메뉴">
            <a href="#category">카테고리</a>
            <a href="#trending">인기 추천</a>
            <a href="#region">지역 찾기</a>
            <a href="#ai">AI 추천</a>
          </nav>

          <div className="header-actions">
            <button className="login-button" type="button">
              로그인
            </button>

            <button className="signup-button" type="button">
              시작하기
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="container">
            <div className="hero-card">
              <div className="hero-copy">
                <span className="hero-kicker">
                  KOREA PICK CURATION
                </span>

                <h1>
                  지금 가장 사랑받는
                  <br />
                  전국의 장소를 만나보세요
                </h1>

                <p>
                  맛집, 카페, 여행지, 축제와 데이트 코스까지.
                  검색과 리뷰 데이터를 바탕으로 지금 주목받는
                  장소를 추천합니다.
                </p>

                <form className="hero-search">
                  <input
                    type="search"
                    aria-label="지역 또는 장소 검색"
                    placeholder="지역, 장소 또는 원하는 분위기를 검색하세요"
                  />

                  <button type="submit">
                    검색
                  </button>
                </form>

                <LiveKeywords />
              </div>

              <div
                className="hero-editorial"
                aria-label="오늘의 추천 장소"
              >
                <div className="editorial-number">
                  01
                </div>

                <div className="editorial-visual">
                  <span>SEOUL SELECTION</span>

                  <strong>
                    오늘의
                    <br />
                    데이트 픽
                  </strong>
                </div>

                <div className="editorial-footer">
                  <div>
                    <span>EDITOR&apos;S CHOICE</span>

                    <h2>
                      한강 노을 데이트 코스
                    </h2>
                  </div>

                  <strong>4.9</strong>
                </div>
              </div>
            </div>

            <div className="quick-filter">
              <span>빠른 탐색</span>

              <button type="button">
                서울 데이트
              </button>

              <button type="button">
                부산 여행
              </button>

              <button type="button">
                제주 맛집
              </button>

              <button type="button">
                비 오는 날
              </button>

              <button type="button">
                주말 나들이
              </button>
            </div>
          </div>
        </section>

        <section
          className="section category-section"
          id="category"
        >
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="section-kicker">
                  EXPLORE
                </span>

                <h2>
                  무엇을 찾고 계신가요?
                </h2>

                <p>
                  관심 카테고리를 선택해 전국의 추천 장소를
                  둘러보세요.
                </p>
              </div>

              <button
                className="text-link-button"
                type="button"
              >
                전체 보기
                <span>→</span>
              </button>
            </div>

            <div className="category-grid">
              {categories.map((category, index) => (
                <button
                  className="category-card"
                  key={category.title}
                  type="button"
                >
                  <span className="category-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="category-label">
                    {category.code}
                  </span>

                  <strong>
                    {category.title}
                  </strong>

                  <small>
                    {category.description}
                  </small>

                  <span className="category-arrow">
                    ↗
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section
          className="section trending-section"
          id="trending"
        >
          <div className="container">
            <div className="section-heading section-heading-light">
              <div>
                <span className="section-kicker">
                  REAL-TIME TREND
                </span>

                <h2>
                  지금 인기 있는 추천
                </h2>

                <p>
                  평점, 누적 리뷰와 최근 리뷰 증가량을
                  실시간으로 반영합니다.
                </p>
              </div>

              <button
                className="text-link-button light-button"
                type="button"
              >
                더 많은 장소
                <span>→</span>
              </button>
            </div>

            <LiveRecommendations />
          </div>
        </section>

        <section
          className="section region-section"
          id="region"
        >
          <div className="container">
            <div className="region-layout">
              <div className="region-copy">
                <span className="section-kicker">
                  REGION GUIDE
                </span>

                <h2>
                  지역별 인기 장소를
                  <br />
                  빠르게 찾아보세요
                </h2>

                <p>
                  원하는 지역을 선택하면 인기 맛집과 카페,
                  관광지와 축제 정보를 한 번에 확인할 수 있습니다.
                </p>

                <div className="region-buttons">
                  {regions.map((region) => (
                    <button
                      key={region}
                      type="button"
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>

              <div className="region-poster">
                <span className="region-poster-label">
                  KOREA
                </span>

                <strong>
                  LOCAL
                  <br />
                  SELECTION
                </strong>

                <small>
                  12 REGIONS · DAILY UPDATE
                </small>
              </div>
            </div>
          </div>
        </section>

        <section
          className="section ai-section"
          id="ai"
        >
          <div className="container">
            <div className="ai-card">
              <div>
                <span>
                  AI PERSONAL CURATOR
                </span>

                <h2>
                  취향에 맞는 하루 코스를
                  <br />
                  한 번에 완성하세요
                </h2>
              </div>

              <p>
                지역, 예산, 인원, 이동 방식과 분위기를 분석해
                실제로 방문 가능한 맞춤 코스를 추천합니다.
              </p>

              <button type="button">
                AI 추천 시작하기
                <span>→</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <a className="brand" href="#top">
            <span className="brand-mark">K</span>
            <span>코리아픽</span>
          </a>

          <p>
            전국의 좋은 장소를 더 쉽고 즐겁게 발견하세요.
          </p>

          <nav aria-label="하단 메뉴">
            <a href="#">서비스 소개</a>
            <a href="#">이용약관</a>
            <a href="#">개인정보처리방침</a>
            <a href="#">문의하기</a>
          </nav>
        </div>
      </footer>
    </>
  );
}