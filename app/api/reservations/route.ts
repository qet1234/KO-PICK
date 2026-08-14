import { createClient } from "@/utils/supabase/server";

type ReservationPayload = {
  placeSource?: string;
  placeId?: string;
  reservationDate?: string;
  reservationTime?: string;
  partySize?: number;
  guestName?: string;
  customerPhone?: string;
  menu?: string;
  note?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeSource = searchParams.get("placeSource")?.trim() ?? "";
  const placeId = searchParams.get("placeId")?.trim() ?? "";
  if (!placeSource || !placeId) {
    return Response.json({ bookable: false }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_bookable_merchant_store", {
    p_place_source: placeSource,
    p_place_id: placeId,
  });
  if (error) return Response.json({ bookable: false }, { status: 200 });
  return Response.json(data ?? { bookable: false });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "로그인이 필요합니다.", loginRequired: true }, { status: 401 });
  }

  const payload = (await request.json()) as ReservationPayload;
  const { data, error } = await supabase.rpc("create_merchant_reservation", {
    p_place_source: payload.placeSource?.trim() ?? "",
    p_place_id: payload.placeId?.trim() ?? "",
    p_reservation_date: payload.reservationDate,
    p_reservation_time: payload.reservationTime,
    p_party_size: Number(payload.partySize),
    p_guest_name: payload.guestName?.trim() ?? "",
    p_customer_phone: payload.customerPhone?.trim() ?? "",
    p_menu: payload.menu?.trim() || null,
    p_note: payload.note?.trim() || null,
  });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data, { status: 201 });
}
