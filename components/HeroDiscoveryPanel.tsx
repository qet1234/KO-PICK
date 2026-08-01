const relationshipJourneys = [
  {
    label: "혼자",
    title: "내 취향대로 가볍게",
    description: "혼밥, 조용한 카페와 혼자 둘러보기 좋은 장소만 모아보세요.",
    href: "/explore?category=전체&journey=혼자",
    icon: "01",
  },
  {
    label: "커플",
    title: "데이트 장소 찾기",
    description: "네이버 검색 반응이 많은 카페·맛집·데이트 명소를 우선 확인하세요.",
    href: "/explore?category=전체&journey=커플",
    icon: "02",
  },
  {
    label: "친구",
    title: "모임에 맞는 장소",
    description: "여럿이 방문하기 좋은 맛집, 축제와 즐길 거리를 확인하세요.",
    href: "/explore?category=전체&journey=친구",
    icon: "03",
  },
  {
    label: "가족",
    title: "온 가족이 함께",
    description: "아이와 부모님까지 편하게 즐길 수 있는 장소를 찾아보세요.",
    href: "/explore?category=전체&journey=가족",
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
    </aside>
  );
}
