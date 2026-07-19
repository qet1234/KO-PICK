import AuthHeader from "@/components/AuthHeader";
import KakaoRegionExplorer from "@/components/KakaoRegionExplorer";
import CategoryCards from "@/components/CategoryCards";
import LiveRecommendations from "@/components/LiveRecommendations";
import HeroSearch from "@/components/HeroSearch";
import "./home.css";

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
            <a href="/couple">커플 공간</a>
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
              설레는
              <br />
              하루의 시작
            </h1>

            <p className="kp-hero-description">
              음식, 카페, 축제와 관광지까지 지역과 세부
              종류에 맞춰 빠르게 찾아보세요.
            </p>

            <HeroSearch />
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

          <CategoryCards />
        </div>
      </section>

      <section className="kp-popular-section" id="popular">
        <div className="kp-container">
          <div className="kp-popular-heading">
            <div>
              <h2>지금 인기 있는 추천</h2>
              <p>조회·상세보기·지도 이동·찜 활동을 실시간으로 반영합니다.</p>
            </div>
          </div>
          <LiveRecommendations />
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
