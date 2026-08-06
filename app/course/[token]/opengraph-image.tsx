import { ImageResponse } from "next/og";
import { getSharedCourse } from "@/utils/course-share-server";

export const alt = "오늘어디 공유 코스";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const course = await getSharedCourse(token);
  const count = course?.snapshot.places.length ?? 0;

  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      justifyContent: "space-between", padding: "76px", color: "white",
      background: "linear-gradient(135deg, #123b28, #2f7b55)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "22px", fontSize: 42, fontWeight: 800 }}>
        <div style={{ width: 74, height: 74, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 24, background: "#f4ce52", color: "#173f2c", fontSize: 24, fontWeight: 900 }}>오늘</div>
        오늘어디
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ fontSize: 82, fontWeight: 900 }}>SHARED COURSE</div>
        <div style={{ fontSize: 34, color: "#d6eadf" }}>{count > 0 ? `${count} PLACES · PRIVATE DETAILS EXCLUDED` : "LINK UNAVAILABLE"}</div>
      </div>
    </div>,
    size,
  );
}
