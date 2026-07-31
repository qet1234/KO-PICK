import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const requireText = (content, text, label) => {
  if (!content.includes(text)) throw new Error(`${label}: ${text} 보호 규칙이 없습니다.`);
};
const rejectText = (content, text, label) => {
  if (content.includes(text)) throw new Error(`${label}: 공개 공유에 금지된 ${text} 필드가 포함됐습니다.`);
};

const api = read("app/api/course-shares/route.ts");
const kakao = read("utils/kakao-share.ts");
const migration = read("supabase/migrations/20260731223000_legal_course_sharing.sql");
const publicPage = read("app/course/[token]/page.tsx");
const nextConfig = read("next.config.ts");
const login = read("app/login/page.tsx");

for (const field of ["imageUrl", "imageCopyrightCode", "relationship", "nickname", "email", "reservationUrl"]) {
  rejectText(api, field, "공유 API");
}
for (const field of ["imageUrl", 'objectType: "feed"']) rejectText(kakao, field, "카카오 공유 카드");
rejectText(publicPage, "<img", "공개 코스 페이지");

requireText(migration, "share_token_hash", "공유 토큰 해시");
requireText(migration, "expires_at", "30일 만료");
requireText(migration, "revoked_at", "공유 취소");
requireText(migration, "active_count >= 20", "활성 링크 제한");
requireText(nextConfig, "noindex, nofollow, noarchive", "검색 제외");
requireText(login, "termsAccepted", "이용약관 개별 동의");
requireText(login, "privacyAccepted", "개인정보 개별 동의");

console.log("Legal course sharing safeguards verified.");
