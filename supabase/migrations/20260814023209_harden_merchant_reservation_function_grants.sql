revoke all on function public.create_merchant_reservation(
  text, text, date, time, integer, text, text, text, text
) from anon;

revoke all on function public.update_merchant_reservation_status(uuid, text)
  from anon;

grant execute on function public.create_merchant_reservation(
  text, text, date, time, integer, text, text, text, text
) to authenticated;

grant execute on function public.update_merchant_reservation_status(uuid, text)
  to authenticated;
