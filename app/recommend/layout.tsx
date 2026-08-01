import type { ReactNode } from "react";
import RecommendCalendarEnhancer from "@/components/RecommendCalendarEnhancer";
import RecommendDateRangeBridge from "@/components/RecommendDateRangeBridge";
import "./recommend-calendar.css";

export default function RecommendLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RecommendDateRangeBridge />
      <RecommendCalendarEnhancer />
      {children}
    </>
  );
}
