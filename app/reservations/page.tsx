import type { Metadata } from "next";
import ReservationPage from "@/components/ReservationPage";
import "./reservations.css";

export const metadata: Metadata = {
  title: "함께 예약 | 오늘어디",
  description: "개인, 커플, 친구, 가족과 장소를 고르고 날짜, 시간, 인원을 정해 예약으로 이어가는 공간",
};

export default function ReservationsPage() {
  return <ReservationPage />;
}
