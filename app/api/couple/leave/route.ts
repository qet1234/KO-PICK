import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("커플 공간 탈퇴용 Supabase 환경변수가 없습니다.");
      return NextResponse.json(
        { success: false, error: "커플 공간 서버 설정을 확인해 주세요." },
        { status: 500 }
      );
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: membership, error: membershipError } = await adminClient
      .from("couple_members")
      .select("couple_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      console.error("커플 공간 멤버십 확인 오류:", membershipError);
      return NextResponse.json(
        { success: false, error: "커플 공간 정보를 확인하지 못했습니다." },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json({ success: true, alreadyLeft: true });
    }

    const { error: deleteError } = await adminClient
      .from("couples")
      .delete()
      .eq("id", membership.couple_id);

    if (deleteError) {
      console.error("커플 공간 삭제 오류:", deleteError);
      return NextResponse.json(
        { success: false, error: "커플 공간 연결을 해제하지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("커플 공간 탈퇴 처리 중 예외:", error);
    return NextResponse.json(
      { success: false, error: "커플 공간 탈퇴 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
