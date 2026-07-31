import type { Metadata } from "next";
import LegalFooter from "@/components/LegalFooter";
import "./globals.css";
import "./legal.css";

export const metadata: Metadata = {
  title: "코리아픽 | 전국 추천 플랫폼",
  description: "전국 맛집, 여행지, 카페와 데이트 코스를 추천합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <LegalFooter />
      </body>
    </html>
  );
}
