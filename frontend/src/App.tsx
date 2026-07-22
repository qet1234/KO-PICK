import { useEffect } from "react";
import { Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import Home from "@/app/page";
import LoginPage from "@/app/login/page";
import AccountPage from "@/app/account/page";
import CoupleSpace from "@/components/CoupleSpace";
import SpacesHub from "@/components/SpacesHub";
import CategoryExplorePage from "@/components/CategoryExplorePage";
import ReservationPage from "@/components/ReservationPage";

const allowedCategories = ["전체", "음식", "카페", "축제", "관광지"] as const;
type Category = (typeof allowedCategories)[number];

function ExplorePage() {
  const [params] = useSearchParams();
  const aliases: Record<string, Category> = {
    맛집: "음식",
    여행지: "관광지",
    문화: "관광지",
  };
  const requested = params.get("category") ?? "전체";
  const normalized = aliases[requested] ?? requested;
  const category = allowedCategories.includes(normalized as Category)
    ? (normalized as Category)
    : "전체";
  return <CategoryExplorePage initialCategory={category} />;
}

function PageMetadata() {
  const location = useLocation();
  useEffect(() => {
    document.title = location.pathname === "/login"
      ? "로그인 | 코리아픽"
      : location.pathname === "/couple"
        ? "우리 둘의 공간 | 코리아픽"
        : location.pathname === "/spaces"
          ? "함께 공간 | 코리아픽"
        : location.pathname === "/reservations"
          ? "함께 예약 | 코리아픽"
        : location.pathname === "/account"
          ? "계정 설정 | 코리아픽"
          : "코리아픽 | 지역별 추천";
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <PageMetadata />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/couple" element={<CoupleSpace />} />
        <Route path="/spaces" element={<SpacesHub />} />
        <Route path="/reservations" element={<ReservationPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}
