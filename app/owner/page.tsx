import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./owner-landing.css";

export const metadata: Metadata = {
  title: "사장님 입점 안내 | 오늘어디",
  description: "오늘어디 초기 제휴 매장 모집과 예약관리 서비스 안내",
};

const benefits = [
  {
    number: "01",
    title: "추천에서 예약까지",
    description: "오늘어디 장소 추천을 본 고객이 매장 상세에서 바로 예약을 신청합니다.",
  },
  {
    number: "02",
    title: "설치 없는 예약관리",
    description: "별도 프로그램 없이 휴대폰과 PC 웹에서 예약을 승인하고 방문 상태를 관리합니다.",
  },
  {
    number: "03",
    title: "초기 제휴 비용 0원",
    description: "수원 지역 초기 제휴 매장 20곳은 입점비와 예약 수수료 없이 시작합니다.",
  },
];

const steps = [
  ["매장 신청", "오늘어디 로그인 후 매장명, 주소와 연락처를 입력합니다."],
  ["운영자 확인", "운영자가 실제 매장 정보와 예약 운영 가능 여부를 확인합니다."],
  ["예약 시작", "승인이 완료되면 고객 화면에 오늘어디 예약 버튼이 활성화됩니다."],
];

export default function OwnerLandingPage() {
  return (
    <main className="owner-landing">
      <header className="owner-landing-nav">
        <Link className="owner-landing-brand" href="/">
          <Image src="/brand-mark.svg" alt="" width={44} height={44} priority />
          <span><strong>오늘어디</strong><small>FOR OWNER</small></span>
        </Link>
        <nav aria-label="사장님 메뉴">
          <a href="#benefits">서비스 소개</a>
          <a href="#steps">입점 절차</a>
          <Link className="owner-nav-login" href="/owner/reservations">예약관리 로그인</Link>
        </nav>
      </header>

      <section className="owner-landing-hero">
        <div className="owner-hero-copy">
          <span className="owner-eyebrow">SUWON EARLY PARTNER · 20 STORES</span>
          <h1>고객의 발견을<br />매장의 예약으로</h1>
          <p>
            오늘어디는 장소 추천과 사장님 예약관리를 연결합니다.
            예약 접수부터 승인, 방문, 완료까지 한 화면에서 관리하세요.
          </p>
          <div className="owner-hero-actions">
            <Link href="/login?next=/owner/reservations">무료 입점 신청</Link>
            <Link href="/owner/reservations">기존 사장님 로그인</Link>
          </div>
          <small className="owner-hero-note">초기에는 예약금 결제 없이 예약 신청과 상태 관리 기능을 제공합니다.</small>
        </div>

        <div className="owner-dashboard-preview" aria-label="사장님 예약관리 화면 미리보기">
          <div className="preview-top">
            <div><i /><span>오늘어디 예약관리</span></div><em>LIVE</em>
          </div>
          <div className="preview-metrics">
            <article><small>오늘 예약</small><strong>12</strong><span>건</span></article>
            <article><small>방문 예정</small><strong>34</strong><span>명</span></article>
            <article><small>승인 대기</small><strong>04</strong><span>건</span></article>
          </div>
          <div className="preview-list">
            <div><time>18:30</time><span><strong>김○○ · 2명</strong><small>창가 자리 요청</small></span><em>승인 대기</em></div>
            <div><time>19:00</time><span><strong>이○○ · 4명</strong><small>기념일 방문</small></span><em className="is-confirmed">예약 확정</em></div>
            <div><time>20:30</time><span><strong>박○○ · 3명</strong><small>요청사항 없음</small></span><em className="is-seated">방문</em></div>
          </div>
        </div>
      </section>

      <section className="owner-benefits" id="benefits">
        <div className="owner-section-title">
          <span>WHY 오늘어디</span>
          <h2>예약 프로그램을 하나 더 설치하는 것이 아니라<br />새 고객을 만나는 예약 창구를 만듭니다.</h2>
        </div>
        <div className="owner-benefit-grid">
          {benefits.map((benefit) => (
            <article key={benefit.number}>
              <span>{benefit.number}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="owner-steps" id="steps">
        <div className="owner-section-title">
          <span>ONBOARDING</span>
          <h2>입점 신청부터 예약 시작까지</h2>
          <p>고객에게 잘못된 매장이 노출되지 않도록 모든 신청은 운영자 확인 후 공개됩니다.</p>
        </div>
        <ol>
          {steps.map(([title, description], index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{title}</h3><p>{description}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="owner-final-cta">
        <span>EARLY PARTNER PROGRAM</span>
        <h2>수원 지역 첫 20개 제휴 매장을 모집합니다.</h2>
        <p>로그인 후 3분이면 신청할 수 있으며, 승인 결과는 사장님 예약관리 화면에서 확인할 수 있습니다.</p>
        <Link href="/login?next=/owner/reservations">지금 무료로 입점 신청</Link>
      </section>
    </main>
  );
}
