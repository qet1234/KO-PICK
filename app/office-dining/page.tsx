import type { Metadata } from "next";
import OfficeDiningFinder from "@/components/OfficeDiningFinder";
import "./office-dining.css";

export const metadata: Metadata = {
  title: "직장인 점심·회식 찾기 | 오늘어디",
  description: "인원, 음식 종류, 금액대를 선택해 네이버 음식점명을 지도 마커로 비교하고 바로 길을 찾아보세요.",
};

export default function OfficeDiningPage() {
  return <OfficeDiningFinder />;
}
