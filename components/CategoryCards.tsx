"use client";

import { useRouter } from "next/navigation";

const categoryCards = [
  {
    number: "01",
    english: "DINING",
    title: "맛집",
    description: "지역별 인기 다이닝",
    target: "음식",
  },
  {
    number: "02",
    english: "CAFE",
    title: "카페",
    description: "분위기 좋은 카페",
    target: "카페",
  },
  {
    number: "03",
    english: "TRAVEL",
    title: "여행지",
    description: "전국 여행 명소",
    target: "관광지",
  },
  {
    number: "04",
    english: "FESTIVAL",
    title: "축제",
    description: "지역별 행사 정보",
    target: "축제",
  },
] as const;

export default function CategoryCards() {
  const router = useRouter();

  const openCategory = (category: string) => {
    router.push("/explore?category=" + encodeURIComponent(category));
  };

  return (
    <div className="kp-category-grid">
      {categoryCards.map(
        ({ number, english, title, description, target }) => (
          <article key={number}>
            <span className="kp-category-number">{number}</span>

            <div>
              <small>{english}</small>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>

            <button
              className="kp-category-arrow"
              type="button"
              aria-label={title + " 전체 결과 보기"}
              title={title + " 전체 결과 보기"}
              onClick={() => openCategory(target)}
            >
              <span aria-hidden="true">↗</span>
            </button>
          </article>
        )
      )}
    </div>
  );
}
