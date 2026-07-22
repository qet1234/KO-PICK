import type { Metadata } from "next";
import SpacesHub from "@/components/SpacesHub";
import "./spaces.css";

export const metadata: Metadata = {
  title: "함께 공간 | 코리아픽",
  description: "개인, 커플, 친구, 가족과 장소와 일정을 함께 계획하는 공간",
};

export default function SpacesPage() {
  return <SpacesHub />;
}
