import type { Metadata } from "next";
import OfficeDiningFinder from "@/components/OfficeDiningFinder";
import "./office-dining.css";

export const metadata: Metadata = {
  title: "직장인 점심·회식 찾기 | 코리아픽",
  description: "인원, 음식 종류, 주차·발렛, 금액대를 선택해 직장인 점심과 회식 장소를 찾고 네이버 지도로 길을 찾아보세요.",
};

export default function OfficeDiningPage() {
  return <OfficeDiningFinder />;
}
