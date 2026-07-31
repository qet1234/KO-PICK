import "server-only";

import { createHash } from "node:crypto";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import type { SharedCourse } from "@/utils/course-share";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isSharedCourse(value: unknown): value is SharedCourse {
  if (!value || typeof value !== "object") return false;
  const course = value as Partial<SharedCourse>;
  return typeof course.title === "string" &&
    typeof course.region === "string" &&
    typeof course.duration === "string" &&
    typeof course.expiresAt === "string" &&
    Boolean(course.snapshot) &&
    Array.isArray(course.snapshot?.places) &&
    course.snapshot.places.length >= 2 &&
    course.snapshot.places.length <= 6;
}

export const getSharedCourse = cache(async (token: string) => {
  if (!TOKEN_PATTERN.test(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_course", {
    p_share_token_hash: tokenHash(token),
  });
  if (error) {
    console.error("공유 코스 조회 오류:", error);
    return null;
  }
  return isSharedCourse(data) ? data : null;
});
