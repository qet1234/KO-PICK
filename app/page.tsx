import AuthHeader from "@/components/AuthHeader";
import KakaoRegionExplorer from "@/components/KakaoRegionExplorer";
import "./home.css";

const categories = [
  ["01", "DINING", "음식", "한식부터 세계음식까지"],
  ["02", "CAFE", "카페", "프랜차이즈와 분위기별 카페"],
  ["03", "FESTIVAL", "축제", "축제·페스티벌·지역 행사"],
  ["04", "ATTRACTION", "관광지", "박물관·전시회·공원"],
];

const recommendations = [
  {
    category: "카페",
    icon: "☕",
    region: "부산 해운대",
    title: "해운대 오션뷰 루프탑 카페",
    rating: "4.8",
    reviews: "961",
    className: "recommendation-beige",
  },
  {
    category: "축제",
    icon: "🎆",
    region: "경기 수원",
    title: "수원화성 야간 문화축제",
    rating: "4.7",
    reviews: "790",
    className: "recommendation-lime",
  },
  {
    category: "관광지",
    icon: "🚙",
    region: "제주 서귀포",
    title: "애월 해안도로 드라이브",
    rating: "4.9",
    reviews: "2,127",
    className: "recommendation-pink",
  },
  {
    category: "관광지",
    icon: "🎪",
    region: "서울 성동구",
    title: "한강 노을 데이트 코스",
    rating: "4.8",
    reviews: "1,559",
    className: "recommendation-yellow",
  },
];

export default function Home() {
  return (
    <main className="korea-pick-home">
      <header className="kp-header">
        <div className="kp-container kp-header-inner">
          <a className="kp-brand" href="#top">
            <span className="kp-brand-mark">K</span>
            <span>코리아픽</span>
          </a>

          <nav className="kp-navigation" aria-label="주요 메뉴">
            <a href="#categories">카테고리</a>
            <a href="#popular">인기 추천</a>
            <a href="#regions">지역 찾기</a>
            <a href="#ai">AI 추천</a>
          </nav>

          <AuthHeader />
        </div>
      </header>

      <section className="kp-hero" id="top">
        <div className="kp-container kp-hero-frame">
          <article className="kp-hero-main">
            <p className="kp-overline kp-overline-light">
              KOREA PICK CURATION
            </p>

            <h1>
              지금 가장 사랑
              <br />
              받는
              <br />
              전국의 장소를
              <br />
              만나보세요
            </h1>

            <p className="kp-hero-description">
              음식, 카페, 축제와 관광지까지 지역과 세부
              종류에 맞춰 빠르게 찾아보세요.
            </p>

            <div className="kp-search">
              <input
                type="search"
                placeholder="장소, 지역 또는 카테고리를 검색하세요"
              />
              <button type="button">검색</button>
            </div>

            <div className="kp-live-tags">
              <small>실시간 인기 검색어</small>

              <div>
                <button type="button">서울 데이트</button>
                <button type="button">부산 관광지</button>
                <button type="button">제주 카페</button>
                <button type="button">수원 음식</button>
              </div>
            </div>
          </article>

          <article className="kp-editor-pick">
            <span className="kp-card-number">01</span>

            <div className="kp-editor-note">
              <small>SEOUL SELECTION</small>
              <strong>
                오늘의
                <br />
                데이트 픽
              </strong>
            </div>

            <div className="kp-editor-footer">
              <div>
                <small>EDITOR&apos;S CHOICE</small>
                <p>한강 노을 데이트 코스</p>
              </div>

              <strong>4.9</strong>
            </div>
          </article>
        </div>

        <div className="kp-container kp-trend-row">
          <strong>빠른 탐색</strong>
          <button type="button">서울 데이트</button>
          <button type="button">부산 관광지</button>
          <button type="button">제주 음식</button>
          <button type="button">비 오는 날</button>
          <button type="button">주말 나들이</button>
        </div>
      </section>

      <section className="kp-category-section" id="categories">
        <div className="kp-container">
          <div className="kp-section-heading">
            <div>
              <p className="kp-overline">EXPLORE</p>
              <h2>무엇을 찾고 계신가요?</h2>
              <p>관심 카테고리를 선택해 추천 장소를 확인하세요.</p>
            </div>

            <button className="kp-outline-button" type="button">
              전체 보기 →
            </button>
          </div>

          <div className="kp-category-grid">
            {categories.map(([number, english, title, description]) => (
              <article key={number}>
                <span className="kp-category-number">{number}</span>

                <div>
                  <small>{english}</small>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>

                <b>↗</b>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="kp-popular-section" id="popular">
        <div className="kp-container">
          <div className="kp-popular-heading">
            <div>
              <h2>지금 인기 있는 추천</h2>
              <p>평점과 최근 리뷰 증가량을 반영합니다.</p>
            </div>
          </div>

          <div className="kp-recommendation-grid">
            {recommendations.map((item) => (
              <article className="kp-recommendation-card" key={item.title}>
                <div
                  className={`kp-recommendation-image ${item.className}`}
                >
                  <span className="kp-card-category">
                    {item.category}
                  </span>

                  <button
                    className="kp-save-button"
                    type="button"
                    aria-label={`${item.title} 저장`}
                  >
                    ♡
                  </button>

                  <span className="kp-card-icon">{item.icon}</span>
                  <span className="kp-live-badge">실시간 인기</span>
                </div>

                <div className="kp-recommendation-content">
                  <small>{item.region}</small>
                  <h3>{item.title}</h3>
                  <p>장소 정보와 방문자 리뷰를 확인해 보세요.</p>
                </div>

                <div className="kp-recommendation-meta">
                  <strong>★ {item.rating}</strong>
                  <span>리뷰 {item.reviews}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <KakaoRegionExplorer />

      <section className="kp-ai-section" id="ai">
        <div className="kp-container kp-ai-panel">
          <div>
            <p className="kp-overline kp-overline-dark">
              AI PERSONAL CURATOR
            </p>

            <h2>
              취향에 맞는 하루 코스를
              <br />
              한 번에 완성하세요
            </h2>
          </div>

          <p>
            지역, 예산, 인원과 분위기를 분석해 맞춤 코스를
            추천합니다.
          </p>

          <button type="button">AI 추천 시작하기 →</button>
        </div>
      </section>
    </main>
  );
}
