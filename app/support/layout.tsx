import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "고객지원 | 코리아픽",
  description: "개인정보, 계정 삭제, 저작권 및 서비스 문의를 안전하게 접수합니다.",
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
