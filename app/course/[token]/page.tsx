import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSharedCourse } from "@/utils/course-share-server";
import { naverPlaceSearchUrl } from "@/utils/course-share";
import "./shared-course.css";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const course = await getSharedCourse(token);
  const title = course ? `${course.title} | 오늘어디` : "공유가 종료된 코스 | 오늘어디";
  const description = course
    ? `${course.region}에서 ${course.snapshot.places.length}곳을 잇는 ${course.duration} 추천 코스입니다.`
    : "만료되었거나 공유가 취소된 코스입니다.";

  return {
    title,
    description,
    robots: { index: false, follow: false, nocache: true },
    openGraph: { title, description, type: "website" },
  };
}
export default async function SharedCoursePage({ params }: Props) {
  const { token } = await params;
  const course = await getSharedCourse(token);
  if (!course) notFound();

  return (
    <main className="shared-course-page">
      <article className="shared-course-shell">
        <header className="shared-course-header">
          <a href="/" className="shared-course-brand"><span>?</span>오늘어디</a>
          <p>SHARED COURSE</p>
          <h1>{course.title}</h1>
          <div className="shared-course-summary">
            <span>{course.region}</span>
            <span>{course.duration}</span>
            <span>{course.snapshot.places.length}곳</span>
          </div>
        </header>

        <section className="shared-course-privacy">
          이 공개 링크에는 코스를 만든 사람의 계정·닉네임·관계·방문일·메모·예약정보가 포함되지 않습니다.
        </section>

        <ol className="shared-course-list">
          {course.snapshot.places.map((place, index) => (
            <li key={`${place.id}-${index}`}>
              <span className="shared-course-order">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <small>{place.category}</small>
                <h2>{place.name}</h2>
                <p>{place.address}</p>
              </div>
              <a href={naverPlaceSearchUrl(place)} target="_blank" rel="noreferrer">지도에서 확인</a>
            </li>
          ))}
        </ol>

        <footer className="shared-course-footer">
          <p>장소 원천: {course.snapshot.source}</p>
          <p>이 링크는 {new Date(course.expiresAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}까지 열립니다. 소유자가 먼저 공유를 취소할 수 있습니다.</p>
          <a href="/recommend">나도 코스 만들기 →</a>
        </footer>
      </article>
    </main>
  );
}
