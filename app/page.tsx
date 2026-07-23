import AuthHeader from "@/components/AuthHeader";
import CategoryCards from "@/components/CategoryCards";
import LiveRecommendations from "@/components/LiveRecommendations";
import HeroSearch from "@/components/HeroSearch";
import HeroLivePick from "@/components/HeroLivePick";
import NaverRegionRecommendations from "@/components/NaverRegionRecommendations";
import "./home.css";
import "./home-recommend.css";
import "./home-navigation.css";
import "./home-naver-region.css";
import "./home-naver-map.css";

export const dynamic = "force-dynamic";

type HomeSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Home({ searchParams }: { searchParams: HomeSearchParams }) {
  const params = await searchParams;
  const region = typeof params.region === "string" ? params.region : "서울";
  const category = typeof params.category === "string" ? params.category : "전체";

  return (
    <main className="korea-pick-home">
      <header className="kp-header">
        <div className="kp-container kp-header-inner">
          <a className="kp-brand" href="#top"><span className="kp-brand-mark">K</span><span>코리아픽</span></a>
          <nav className="kp-navigation" aria-label="주요 메뉴">
            <a href="/recommend">오늘 어디 갈까?</a><a href="#categories">카테고리</a><a href="#popular">인기 추천</a><a href="#regions">지역 찾기</a><a href="/spaces">함께 공간</a><a href="/reservations">함께 예약</a>
          </nav>
          <AuthHeader />
        </div>
      </header>

      <section className="kp-hero" id="top">
        <div className="kp-container kp-hero-frame kp-hero-frame--single">
          <article className="kp-hero-main">
            <p className="kp-overline kp-overline-light">KOREA PICK CURATION</p>
            <h1>검색 없이<br />오늘 갈 곳 결정</h1>
            <p className="kp-hero-description">누구와, 언제, 어떤 기분인지 알려주면 이용자 성향에 맞는 장소를 자동으로 골라드려요.</p>
            <a className="kp-auto-recommend-link" href="/recommend">자동 추천 시작하기 →</a>
            <HeroSearch />
          </article>
        </div>
      </section>

      <section className="kp-category-section" id="categories">
        <div className="kp-container">
          <div className="kp-section-heading"><div><p className="kp-overline">WHAT TO FIND</p><h2>무엇을 찾고 있나요?</h2><p>맛집, 카페, 축제와 관광지 중 원하는 장소 종류를 먼저 선택해 보세요.</p></div></div>
          <CategoryCards />
        </div>
      </section>

      <section className="kp-popular-section" id="popular">
        <div className="kp-container">
          <div className="kp-popular-heading"><div><h2 className="kp-popular-title">지금 인기 있는 추천<span className="kp-popular-star" aria-hidden="true">★</span></h2><p>조회·상세보기·지도 이동·찜 활동을 반영해 지금 관심이 높은 장소를 보여드립니다.</p></div></div>
          <LiveRecommendations />
        </div>
      </section>

      <section className="kp-region-live-section" id="regions">
        <div className="kp-container">
          <div className="kp-region-live-heading"><p className="kp-overline">WHERE TO FIND</p><h2>원하는 지역의<br />추천 장소를 바로 확인하세요.</h2><p>실시간 오늘의 픽과 네이버 지역 검색 기반 추천 리스트를 한 화면에서 확인할 수 있습니다.</p></div>
          <div className="kp-region-live-grid">
            <div className="kp-region-live-pick"><HeroLivePick /></div>
            <NaverRegionRecommendations region={region} category={category} />
          </div>
        </div>
      </section>

      <footer className="kp-footer" id="privacy">
        <div className="kp-container kp-privacy-panel">
          <div className="kp-privacy-heading"><p className="kp-overline kp-overline-light">PRIVACY &amp; SAFETY</p><h2>개인정보를 소중하게 보호합니다.</h2><p>서비스 제공에 필요한 최소한의 정보만 처리하고, 이용 목적이 끝난 정보는 안전하게 삭제합니다.</p></div>
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
