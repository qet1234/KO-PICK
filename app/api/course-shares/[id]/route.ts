import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "공유 링크 ID가 올바르지 않습니다." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const { data, error } = await supabase.rpc("revoke_course_share", { p_share_id: id });
    if (error) throw error;
    if (data !== true) return NextResponse.json({ error: "취소할 공유 링크를 찾지 못했습니다." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("코스 공유 링크 취소 오류:", error);
    return NextResponse.json({ error: "공유 링크를 취소하지 못했습니다." }, { status: 500 });
  }
}
