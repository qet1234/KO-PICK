import AuthHeader from "@/components/AuthHeader";
import KakaoRegionExplorer from "@/components/KakaoRegionExplorer";
import CategoryCards from "@/components/CategoryCards";
import LiveRecommendations from "@/components/LiveRecommendations";
import HeroSearch from "@/components/HeroSearch";
import HeroDiscoveryPanel from "@/components/HeroDiscoveryPanel";
import "./home.css";
import "./home-recommend.css";
import "./home-navigation.css";
import "./home-discovery.css";
import "./home-catch-search.css";
import "./home-weather.css";
import "./home-clarity.css";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="korea-pick-home">
      <header className="kp-header">
        <div className="kp-container kp-header-inner">
          <a className="kp-brand" href="#top"><span className="kp-brand-mark">K</span><span>코리아픽</span></a>
          <nav className="kp-navigation" aria-label="주요 메뉴">
            <a href="#categories">카테고리</a><a href="#popular">인기 추천</a><a href="#regions">지역 찾기</a><a href="/spaces">함께 공간</a><a href="/reservations">함께 예약</a>
          </nav>
          <AuthHeader />
        </div>
      </header>

      <section className="kp-hero" id="top">
        <div className="kp-container kp-hero-frame kp-hero-frame--discovery">
          <article className="kp-hero-main">
            <p className="kp-overline kp-overline-light">KOREA PICK CURATION</p>
            <h1>검색 없이<br />오늘 갈 곳 결정</h1>
            <p className="kp-hero-description">전국의 맛집, 카페, 축제와 관광지를 검색하거나 원하는 지역에서 직접 찾아보세요.</p>
            <HeroSearch />
          </article>
          <HeroDiscoveryPanel />
        </div>
      </section>

      <section className="kp-category-section" id="categories">
        <div className="kp-container">
          <div className="kp-section-heading">
            <div>
              <p className="kp-overline">WHAT TO FIND</p>
              <h2>무엇을 찾고 있나요?</h2>
              <p>맛집, 카페, 축제와 관광지 중 원하는 장소 종류를 먼저 선택해 보세요.</p>
            </div>
          </div>
          <CategoryCards />
        </div>
      </section>

      <section className="kp-popular-section" id="popular">
        <div className="kp-container">
          <div className="kp-popular-heading">
            <div>
              <h2 className="kp-popular-title">지금 인기 있는 추천<span className="kp-popular-star" aria-hidden="true">★</span></h2>
              <p>조회·상세보기·지도 이동·찜 활동을 반영해 지금 관심이 높은 장소를 보여드립니다.</p>
            </div>
          </div>
          <LiveRecommendations />
        </div>
      </section>

      <div className="kp-region-journey" id="regions">
        <div className="kp-region-journey-intro" aria-labelledby="region-journey-title">
          <p className="kp-overline">WHERE TO FIND</p>
          <h2 id="region-journey-title">원하는 지역에서<br />직접 찾아볼까요?</h2>
          <p>시·도와 시·군·구를 먼저 선택하고, 필요한 경우 작은 카테고리 필터로 결과를 좁혀보세요.</p>
        </div>
        <KakaoRegionExplorer />
      </div>

      <footer className="kp-footer" id="privacy">
        <div className="kp-container kp-privacy-panel">
          <div className="kp-privacy-heading">
            <p className="kp-overline kp-overline-light">PRIVACY &amp; SAFETY</p>
            <h2>개인정보를 소중하게 보호합니다.</h2>
            <p>서비스 제공에 필요한 최소한의 정보만 처리하고, 이용 목적이 끝난 정보는 안전하게 삭제합니다.</p>
          </div>
          <div className="kp-privacy-grid">
            <article><span>01</span><strong>필요한 정보만 처리</strong><p>소셜 로그인 계정 식별자, 이메일 및 공개 프로필 정보는 회원 식별과 서비스 제공 목적으로만 사용합니다.</p></article>
            <article><span>02</span><strong>공간 정보 비공개</strong><p>개인·커플·친구·가족 공간의 일정과 기록은 해당 공간의 구성원만 확인할 수 있도록 접근 권한을 제한합니다.</p></article>
            <article><span>03</span><strong>탈퇴 시 안전하게 삭제</strong><p>회원탈퇴 시 개인정보와 저장 데이터는 관련 법령상 보관 의무가 있는 경우를 제외하고 삭제합니다.</p></article>
          </div>
          <div className="kp-privacy-footer"><span>© 2026 KOREA PICK</span><a href="/account">개인정보·계정 관리 →</a></div>
        </div>
      </footer>
    </main>
  );
}
