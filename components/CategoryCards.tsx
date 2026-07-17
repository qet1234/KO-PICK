"use client";

import Link from "next/link";

const categoryCards = [
  {
    number: "01",
    english: "DINING",
    title: "음식",
    description: "한식부터 세계음식까지",
    target: "음식",
  },
  {
    number: "02",
    english: "CAFE",
    title: "카페",
    description: "프랜차이즈와 분위기별 카페",
    target: "카페",
  },
  {
    number: "03",
    english: "FESTIVAL",
    title: "축제",
    description: "축제·페스티벌·지역 행사",
    target: "축제",
  },
  {
    number: "04",
    english: "ATTRACTION",
    title: "관광지",
    description: "박물관·전시회·공원",
    target: "관광지",
  },
] as const;

export default function CategoryCards() {
  return (
    <div className="kp-category-grid">
      {categoryCards.map(
        ({ number, english, title, description, target }) => (
          <article key={number}>
            <span className="kp-category-number">{number}</span>

            <div className="kp-category-card-copy">
              <small>{english}</small>
              <strong>{title}</strong>
              <span>{description}</span>
            </div>

            <Link
              className="kp-category-arrow"
              href={"/explore?category=" + encodeURIComponent(target)}
              aria-label={title + " 카테고리와 세부 필터 보기"}
              title={title + " 카테고리 보기"}
            >
              <span aria-hidden="true">↗</span>
            </Link>
          </article>
        )
      )}
    </div>
  );
}
