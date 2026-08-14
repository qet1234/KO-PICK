import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const payload = await request.json() as Record<string, unknown>;
  const placeSource = String(payload.placeSource ?? "").trim().toUpperCase();
  const placeId = String(payload.placeId ?? "").trim();
  const name = String(payload.name ?? "").trim();
  if (!placeId || !name || !["TOUR_API", "NAVER_LOCAL", "MANUAL"].includes(placeSource)) {
    return Response.json({ error: "매장 정보를 확인해 주세요." }, { status: 400 });
  }

  const { data, error } = await supabase.from("merchant_stores").insert({
    owner_user_id: user.id,
    place_source: placeSource,
    place_id: placeId,
    name,
    address: String(payload.address ?? "").trim() || null,
    phone: String(payload.phone ?? "").trim() || null,
    approval_status: "pending",
  }).select("id,name,approval_status").single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ store: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const payload = await request.json() as { reservationId?: string; status?: string };
  const { data, error } = await supabase.rpc("update_merchant_reservation_status", {
    p_reservation_id: payload.reservationId,
    p_status: payload.status,
  });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}
