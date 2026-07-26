const seasons = [
  {
    key: "spring",
    korean: "봄",
    english: "SPRING",
    months: "3–5월",
    title: "향긋하게 입맛을 깨우는 계절",
    description: "봄나물의 향과 살이 오른 제철 해산물로 가볍고 산뜻하게 즐겨보세요.",
    foods: [
      { name: "도다리쑥국", note: "담백한 도다리와 향긋한 쑥" },
      { name: "주꾸미볶음", note: "탱글한 식감과 매콤한 양념" },
      { name: "봄나물 비빔밥", note: "냉이·달래·참나물을 한 그릇에" },
      { name: "바지락 칼국수", note: "제철 바지락으로 낸 시원한 국물" },
    ],
  },
  {
    key: "summer",
    korean: "여름",
    english: "SUMMER",
    months: "6–8월",
    title: "시원하게 채우는 여름 한 끼",
    description: "더위를 식혀주는 차가운 면 요리와 든든한 보양식으로 여름을 즐겨보세요.",
    foods: [
      { name: "평양냉면", note: "슴슴하고 차가운 육수의 매력" },
      { name: "초계국수", note: "새콤한 육수와 담백한 닭고기" },
      { name: "삼계탕", note: "기운을 채워주는 대표 보양식" },
      { name: "물회", note: "제철 회와 채소를 시원하게" },
    ],
  },
  {
    key: "autumn",
    korean: "가을",
    english: "AUTUMN",
    months: "9–11월",
    title: "불향과 감칠맛이 깊어지는 계절",
    description: "살이 통통하게 오른 해산물과 향이 짙어진 버섯으로 풍성한 식탁을 만나보세요.",
    foods: [
      { name: "전어구이", note: "고소한 기름과 진한 불향" },
      { name: "대하구이", note: "소금 위에서 구워낸 탱글한 식감" },
      { name: "꽃게탕", note: "달큰한 꽃게와 칼칼한 국물" },
      { name: "송이버섯 전골", note: "가을 버섯의 깊고 은은한 향" },
    ],
  },
  {
    key: "winter",
    korean: "겨울",
    english: "WINTER",
    months: "12–2월",
    title: "따뜻하고 든든하게 즐기는 계절",
    description: "차가운 바다에서 맛이 오른 제철 생선과 김이 모락모락 나는 국물을 골라보세요.",
    foods: [
      { name: "굴국밥", note: "통통한 굴과 뜨끈한 국물" },
      { name: "대방어회", note: "겨울에 더 고소하고 두툼한 맛" },
      { name: "과메기", note: "김·미역·채소와 즐기는 별미" },
      { name: "만두전골", note: "푸짐한 만두와 채소를 보글보글" },
    ],
  },
] as const;

export default function SeasonalFoodList() {
  return (
    <section className="kp-seasonal-section" id="seasonal-foods">
      <div className="kp-container">
        <div className="kp-seasonal-heading">
          <div>
            <p className="kp-overline">FOOD BY SEASON</p>
            <h2>사계절, 지금 맛있는 음식</h2>
            <p>계절마다 가장 맛있는 재료와 대표 메뉴를 한눈에 골라보세요.</p>
          </div>
          <span className="kp-seasonal-count">
            <strong>4</strong>
            <small>SEASONS · 16 PICKS</small>
          </span>
        </div>

        <div className="kp-seasonal-grid">
          {seasons.map((season, seasonIndex) => (
            <article
              className={`kp-season-card is-${season.key}`}
              key={season.key}
            >
              <header className="kp-season-card-header">
                <div className="kp-season-symbol" aria-hidden="true">
                  {season.korean}
                </div>
                <div>
                  <small>{season.english}</small>
                  <span>{season.months}</span>
                </div>
                <b>{String(seasonIndex + 1).padStart(2, "0")}</b>
              </header>

              <div className="kp-season-card-copy">
                <h3>{season.title}</h3>
                <p>{season.description}</p>
              </div>

              <ol className="kp-season-food-list">
                {season.foods.map((food, foodIndex) => (
                  <li key={food.name}>
                    <span>{String(foodIndex + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{food.name}</strong>
                      <small>{food.note}</small>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
