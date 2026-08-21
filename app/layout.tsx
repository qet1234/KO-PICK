import type { Metadata, Viewport } from "next";
import LegalFooter from "@/components/LegalFooter";
import OperationsTelemetry from "@/components/OperationsTelemetry";
import TrafficTracker from "@/components/TrafficTracker";
import WebFeatureFlagGate from "@/components/WebFeatureFlagGate";
import MobileBottomNav from "@/components/MobileBottomNav";
import "./globals.css";
import "./legal.css";
import "./mobile-bottom-nav.css";

export const metadata: Metadata = {
  title: "오늘어디 | 전국 추천 플랫폼",
  description: "전국 맛집, 여행지, 카페와 데이트 코스를 추천합니다.",
  applicationName: "오늘어디",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "오늘어디",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/brand-mark.svg", type: "image/svg+xml" },
      { url: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/brand-mark.svg",
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ff3b36",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <OperationsTelemetry />
        <TrafficTracker />
        <WebFeatureFlagGate>{children}</WebFeatureFlagGate>
        <MobileBottomNav />
        <LegalFooter />
      </body>
    </html>
  );
}
