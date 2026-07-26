"use client";

const categoryCards = [
  {
    number: "01",
    english: "DINING",
    title: "음식",
    description: "한식부터 세계음식까지",
    href: "/explore?category=" + encodeURIComponent("음식"),
    external: false,
  },
  {
    number: "02",
    english: "CAFE",
    title: "카페",
    description: "개성 있는 카페와 분위기별 추천",
    href: "/explore?category=" + encodeURIComponent("카페"),
    external: false,
  },
  {
    number: "03",
    english: "FESTIVAL",
    title: "축제",
    description: "축제·페스티벌·지역 행사",
    href: "/explore?category=" + encodeURIComponent("축제"),
    external: false,
  },
  {
    number: "04",
    english: "ATTRACTION",
    title: "관광지",
    description: "박물관·전시회·공원",
    href: "/explore?category=" + encodeURIComponent("관광지"),
    external: false,
  },
  {
    number: "05",
    english: "BOOKING",
    title: "예약",
    description: "네이버 예약 가능한 장소 바로가기",
    href: "https://booking.naver.com/",
    external: true,
  },
] as const;

export default function CategoryCards() {
  return (
    <div className="kp-category-grid">
      {categoryCards.map(
        ({ number, english, title, description, href, external }) => (
          <article key={number}>
            <span className="kp-category-number">{number}</span>

            <div className="kp-category-card-copy">
              <small>{english}</small>
              <strong>{title}</strong>
              <span>{description}</span>
            </div>

            <a
              className="kp-category-arrow"
              href={href}
              aria-label={external ? "네이버 예약 화면 열기" : title + " 카테고리와 세부 필터 보기"}
              title={external ? "네이버 예약 바로가기" : title + " 카테고리 보기"}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
            >
              <span aria-hidden="true">↗</span>
            </a>
          </article>
        )
      )}
    </div>
  );
}
