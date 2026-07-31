export default function SharedCourseNotFound() {
  return (
    <main className="shared-course-page">
      <section className="shared-course-unavailable">
        <span>K</span>
        <p>SHARED COURSE</p>
        <h1>공유가 종료된 코스예요</h1>
        <p>30일이 지나 만료되었거나 코스를 만든 사람이 공유를 취소했습니다.</p>
        <a href="/recommend">새 코스 만들기</a>
      </section>
    </main>
  );
}
