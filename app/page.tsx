import AuthHeader from "@/components/AuthHeader";
import Image from "next/image";
import HomeAppDiscovery from "@/components/HomeAppDiscovery";
import AppIcon from "@/components/AppIcon";
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
import "./home-category-grid.css";
import "./home-catchtable.css";
import "./home-app-redesign.css";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="korea-pick-home" id="top">
      <header className="kp-header">
        <div className="kp-container kp-header-inner">
          <a className="kp-brand" href="#top" aria-label="오늘어디 홈">
            <Image className="kp-brand-mark" src="/brand-mark.svg" alt="" width={64} height={64} priority />
            <span>오늘어디</span>
          </a>
          <nav className="kp-navigation" aria-label="주요 메뉴">
            <a href="#discovery">장소 찾기</a><a href="#journeys">맞춤 추천</a><a href="#seasonal-foods">사계절 음식</a>
          </nav>
          <div className="kp-header-service-buttons">
            <a
              className="kp-header-office-button"
              href="/office-dining"
              aria-label="직장인 점심과 회식 장소 찾기"
            >
              <span aria-hidden="true">식</span>
              직장인 식사
            </a>
            <a
              className="kp-header-place-button"
              href="/recommend"
              aria-label="맞춤 코스 설정 화면으로 이동"
            >
              <span aria-hidden="true">↗</span>
              코스 설정
            </a>
          </div>
          <AuthHeader />
          <a className="kp-mobile-alert" href="/account" aria-label="알림과 내 계정">
            <AppIcon name="bell" size={21} />
          </a>
        </div>
      </header>

      <div id="discovery"><HomeAppDiscovery /></div>

      <section className="kp-hero" id="journeys">
        <div className="kp-container kp-hero-frame kp-hero-frame--discovery">
          <HeroWeatherDashboard />
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
            <article><span>02</span><strong>회원별 접근 제한</strong><p>저장 장소와 최근 본 장소는 로그인한 본인만 확인할 수 있도록 접근 권한을 제한합니다.</p></article>
            <article><span>03</span><strong>탈퇴 시 안전하게 삭제</strong><p>회원탈퇴 시 개인정보와 저장 데이터는 관련 법령상 보관 의무가 있는 경우를 제외하고 삭제합니다.</p></article>
          </div>
          <div className="kp-privacy-footer">
            <span>© 2026 오늘어디</span>
            <a href="/privacy">개인정보처리방침 →</a>
            <a href="/sources">데이터 출처·저작권 →</a>
            <a href="/account">개인정보·계정 관리 →</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
