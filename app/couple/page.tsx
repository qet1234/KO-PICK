import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CoupleSpace from "@/components/CoupleSpace";
import { createClient } from "@/utils/supabase/server";
import "./couple.css";

export const metadata: Metadata = {
  title: "우리 둘의 공간 | 코리아픽",
  description: "커플 두 사람만 공유하는 비공개 기념일과 달력",
};

export default async function CouplePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <CoupleSpace />;
}
