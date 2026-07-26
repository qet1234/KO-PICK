import AuthHeader from "@/components/AuthHeader";
import CategoryCards from "@/components/CategoryCards";
import LiveRecommendations from "@/components/LiveRecommendations";
import HeroDiscoveryPanel from "@/components/HeroDiscoveryPanel";
import HeroWeatherDashboard from "@/components/HeroWeatherDashboard";
import SeasonalFoodList from "@/components/SeasonalFoodList";
import "./home.css";
import "./home-recommend.css";
import "./home-discovery.css";
import "./home-weather-dashboard.css";
import "./home-weather-navigation.css";
import "./home-place-location.css";
import "./home-clarity.css";
import "./home-seasonal-food.css";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="korea-pick-home">
      <header className="kp-header">
        <div className="kp-container kp-header-inner">
          <a className="kp-brand" href="#top"><span className="kp-brand-mark">K</span><span>코리아픽</span></a>
          <nav className="kp-navigation" aria-label="주요 메뉴">
            <a href="#categories">카테고리</a><a href="#popular">인기 추천</a><a href="#seasonal-foods">사계절 음식</a>
            <a href="https://booking.naver.com/" target="_blank" rel="noopener noreferrer">네이버 예약</a>
          </nav>
          <a
            className="kp-header-place-button"
            href="/explore"
            aria-label="전국 장소 찾기 화면으로 이동"
          >
            <span aria-hidden="true">⌖</span>
            장소 찾기
          </a>
          <AuthHeader />
        </div>
      </header>

      <section className="kp-hero" id="top">
        <div className="kp-container kp-hero-frame kp-hero-frame--discovery">
          <HeroWeatherDashboard />
          <HeroDiscoveryPanel />
        </div>
      </section>

      <section className="kp-category-section" id="categories">
        <div className="kp-container">
          <div className="kp-section-heading">
            <div>
              <p className="kp-overline">WHAT TO FIND</p>
              <h2>무엇을 찾고 있나요?</h2>
              <p>맛집, 카페, 축제, 관광지를 찾거나 네이버에서 바로 예약해 보세요.</p>
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

      <SeasonalFoodList />

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
