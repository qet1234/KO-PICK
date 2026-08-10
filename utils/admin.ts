import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/utils/supabase/server";

function requiredEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error("관리자 페이지용 Supabase 서버 환경변수가 없습니다.");
  }

  return { serviceRoleKey, url };
}

export function createAdminClient() {
  const { serviceRoleKey, url } = requiredEnvironment();

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function configuredAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function getAdminAccess() {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    return { authorized: false, user: null } as const;
  }

  const email = user.email?.toLowerCase();
  if (email && configuredAdminEmails().has(email)) {
    return { authorized: true, user } as const;
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("관리자 권한 조회 오류:", error.message);
  }

  return { authorized: Boolean(data), user } as const;
}
