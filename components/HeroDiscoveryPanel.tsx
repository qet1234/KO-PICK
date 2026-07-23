const relationshipJourneys = [
  {
    label: "혼자",
    title: "내 취향대로 가볍게",
    description: "혼밥, 조용한 카페와 혼자 둘러보기 좋은 장소를 찾아보세요.",
    href: "/explore?category=카페&detail=조용한카페&journey=혼자",
    icon: "01",
  },
  {
    label: "커플",
    title: "데이트 장소 찾기",
    description: "분위기 좋은 맛집부터 산책·전시·카페까지 함께 찾아보세요.",
    href: "/explore?category=카페&detail=감성카페&journey=커플",
    icon: "02",
  },
  {
    label: "친구",
    title: "모임에 맞는 장소",
    description: "여럿이 방문하기 좋은 맛집, 축제와 즐길 거리를 확인하세요.",
    href: "/explore?category=음식&detail=전체&journey=친구",
    icon: "03",
  },
  {
    label: "가족",
    title: "온 가족이 함께",
    description: "아이와 부모님까지 편하게 즐길 수 있는 장소를 찾아보세요.",
    href: "/explore?category=관광지&detail=공원&journey=가족",
    icon: "04",
  },
];

export default function HeroDiscoveryPanel() {
  return (
    <aside className="kp-hero-discovery" aria-label="관계별 장소 탐색">
      <div className="kp-hero-journey-heading">
        <div>
          <small>KO-PICK JOURNEY</small>
          <h2>누구와 가나요?</h2>
          <p>예약 중심이 아니라 함께하는 사람과 목적에 맞춰 전국의 장소를 탐색합니다.</p>
        </div>
        <a href="/explore?category=전체">모든 장소 보기 →</a>
      </div>

      <div className="kp-relationship-grid">
        {relationshipJourneys.map((journey) => (
          <a className="kp-relationship-card" href={journey.href} key={journey.label}>
            <span>{journey.icon}</span>
            <small>{journey.label}</small>
            <strong>{journey.title}</strong>
            <p>{journey.description}</p>
            <b>지도에서 찾기 →</b>
          </a>
        ))}
      </div>

      <div className="kp-hero-difference-actions">
        <a className="is-space" href="/spaces">
          <small>TOGETHER SPACE</small>
          <strong>장소 후보를 함께 저장하고 결정</strong>
          <p>개인·커플·친구·가족 공간에서 서로 찾은 장소를 한곳에 모아보세요.</p>
          <span>함께 공간 열기 →</span>
        </a>

        <a className="is-region" href="#regions">
          <small>LOCAL EXPLORER</small>
          <strong>시·도부터 시·군·구까지 직접 탐색</strong>
          <p>전국 지도와 세부 지역 필터를 이용해 원하는 지역을 빠르게 좁혀보세요.</p>
          <span>지역 지도 보기 ↓</span>
        </a>
      </div>
    </aside>
  );
}
