import { NextResponse } from "next/server";
import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";
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
        {
          success: false,
          error:
            "로그인 정보가 없거나 만료되었습니다.",
        },
        {
          status: 401,
        },
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "회원탈퇴용 Supabase 환경변수가 없습니다.",
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "회원탈퇴 서버 설정이 완료되지 않았습니다.",
        },
        {
          status: 500,
        },
      );
    }

    const adminClient = createAdminClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { error: deleteError } =
      await adminClient.auth.admin.deleteUser(
        user.id,
      );

    if (deleteError) {
      console.error(
        "회원탈퇴 처리 오류:",
        deleteError,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "회원정보 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "회원정보와 연결 데이터가 삭제되었습니다.",
    });
  } catch (error) {
    console.error(
      "회원탈퇴 처리 중 예외:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "회원탈퇴 처리 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
