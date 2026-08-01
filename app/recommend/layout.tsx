import type { ReactNode } from "react";
import RecommendCalendarEnhancer from "@/components/RecommendCalendarEnhancer";
import "./recommend-calendar.css";

export default function RecommendLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RecommendCalendarEnhancer />
      {children}
    </>
  );
}
