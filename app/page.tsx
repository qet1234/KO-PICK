import AuthHeader from "@/components/AuthHeader";
import KakaoRegionExplorer from "@/components/KakaoRegionExplorer";
import CategoryCards from "@/components/CategoryCards";
import LiveRecommendations from "@/components/LiveRecommendations";
import HeroSearch from "@/components/HeroSearch";
import HeroLivePick from "@/components/HeroLivePick";
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

          <HeroLivePick />
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
          </div>

          <CategoryCards />
        </div>
      </section>

      <section className="kp-popular-section" id="popular">
        <div className="kp-container">
          <div className="kp-popular-heading">
            <div>
              <h2 className="kp-popular-title">
                지금 인기 있는 추천
                <span className="kp-popular-star" aria-hidden="true">★</span>
              </h2>
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

      <footer className="kp-footer" id="privacy">
        <div className="kp-container kp-privacy-panel">
          <div className="kp-privacy-heading">
            <p className="kp-overline kp-overline-light">PRIVACY &amp; SAFETY</p>
            <h2>개인정보를 소중하게 보호합니다.</h2>
            <p>
              서비스 제공에 필요한 최소한의 정보만 처리하고,
              이용 목적이 끝난 정보는 안전하게 삭제합니다.
            </p>
          </div>

          <div className="kp-privacy-grid">
            <article>
              <span>01</span>
              <strong>필요한 정보만 처리</strong>
              <p>
                소셜 로그인 계정 식별자, 이메일 및 공개 프로필 정보는
                회원 식별과 서비스 제공 목적으로만 사용합니다.
              </p>
            </article>

            <article>
              <span>02</span>
              <strong>커플 정보 비공개</strong>
              <p>
                커플 공간의 일정과 기념일은 연결된 두 사용자만
                확인할 수 있도록 접근 권한을 제한합니다.
              </p>
            </article>

            <article>
              <span>03</span>
              <strong>탈퇴 시 안전하게 삭제</strong>
              <p>
                회원탈퇴 시 개인정보와 저장 데이터는 관련 법령상
                보관 의무가 있는 경우를 제외하고 삭제합니다.
              </p>
            </article>
          </div>

          <div className="kp-privacy-footer">
            <span>© 2026 KOREA PICK</span>
            <a href="/account">개인정보·계정 관리 →</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
