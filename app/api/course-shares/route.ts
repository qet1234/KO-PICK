import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type {
  CreatedCourseShare,
  OwnedCourseShare,
  PublicCoursePlace,
  PublicCourseSnapshot,
} from "@/utils/course-share";

export const runtime = "nodejs";

type IncomingPlace = Partial<PublicCoursePlace>;
type IncomingShare = {
  duration?: unknown;
  places?: unknown;
  region?: unknown;
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
function cleanPlace(value: unknown): PublicCoursePlace | null {
  if (!value || typeof value !== "object") return null;
  const place = value as IncomingPlace;
  const id = cleanText(place.id, 160);
  const name = cleanText(place.name, 120);
  const category = cleanText(place.category, 40);
  const address = cleanText(place.address, 240);
  if (!id || !name || !category || !address) return null;
  return { id, name, category, address };
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

export async function GET() {
  try {
    const { supabase, user } = await authenticatedClient();
    if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const { data, error } = await supabase.rpc("list_my_course_shares");
    if (error) throw error;
    return NextResponse.json({ shares: Array.isArray(data) ? data as OwnedCourseShare[] : [] });
  } catch (error) {
    console.error("내 공유 코스 조회 오류:", error);
    return NextResponse.json({ error: "공유 링크 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await authenticatedClient();
    if (!user) return NextResponse.json({ error: "공유 링크를 만들려면 로그인해 주세요." }, { status: 401 });

    const body = await request.json().catch(() => null) as IncomingShare | null;
    const region = cleanText(body?.region, 40);
    const duration = cleanText(body?.duration, 20);
    const places = Array.isArray(body?.places)
      ? body.places.slice(0, 7).map(cleanPlace).filter((place): place is PublicCoursePlace => place !== null)
      : [];

    if (!region || !duration || places.length < 2 || places.length > 6) {
      return NextResponse.json(
        { error: "공유할 코스는 지역·소요시간과 2~6곳의 공개 장소 정보가 필요합니다." },
        { status: 400 },
      );
    }

    const token = randomBytes(24).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const title = `${region} ${duration} 코스`.slice(0, 80);
    const snapshot: PublicCourseSnapshot = { places, source: "한국관광공사 TourAPI" };

    const { data, error } = await supabase.rpc("create_course_share", {
      p_duration: duration,
      p_expires_at: expiresAt,
      p_region: region,
      p_share_token_hash: tokenHash,
      p_snapshot: snapshot,
      p_title: title,
    });
    if (error) throw error;

    const created = data as Omit<CreatedCourseShare, "url">;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
    const url = new URL(`/course/${token}`, appUrl).toString();
    return NextResponse.json({ share: { ...created, url } satisfies CreatedCourseShare }, { status: 201 });
  } catch (error) {
    console.error("코스 공유 링크 생성 오류:", error);
    const message = error instanceof Error && error.message.includes("활성 공유 링크")
      ? error.message
      : "공유 링크를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
