import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import OwnerReservationManager from "./OwnerReservationManager";
import "./owner-reservations.css";

export const dynamic = "force-dynamic";

export default async function OwnerReservationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/owner/reservations");

  const { data: stores } = await supabase.from("merchant_stores")
    .select("id,name,address,place_source,place_id,approval_status")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true });
  const storeIds = (stores ?? []).filter((store) => store.approval_status === "approved").map((store) => store.id);
  const reservations = storeIds.length ? (await supabase.from("merchant_reservations")
    .select("id,store_id,guest_name,customer_phone,reservation_date,reservation_time,party_size,menu,note,status,source,created_at")
    .in("store_id", storeIds)
    .order("reservation_date", { ascending: true })
    .order("reservation_time", { ascending: true })
    .limit(200)).data ?? [] : [];

  return <main className="owner-shell">
    <header className="owner-header"><div><span>오늘어디 FOR OWNER</span><h1>사장님 예약관리</h1><p>고객 예약을 확인하고 승인·방문·완료 상태를 관리하세요.</p></div><Link href="/">고객용 화면 보기</Link></header>
    <OwnerReservationManager initialStores={stores ?? []} initialReservations={reservations} />
  </main>;
}
