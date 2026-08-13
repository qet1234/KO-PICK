revoke execute on function public.get_shared_course(text) from public;
revoke execute on function public.get_shared_place_poll(text, text) from public;
revoke execute on function public.vote_shared_place_poll(text, uuid, text, text) from public;
revoke execute on function public.close_place_poll(uuid, uuid) from public;
revoke execute on function public.create_course_share(text, text, text, jsonb, text, timestamptz) from public;
revoke execute on function public.create_place_poll(text, jsonb) from public;
revoke execute on function public.list_my_course_shares() from public;
revoke execute on function public.record_user_legal_consents(text, text, text) from public;
revoke execute on function public.revoke_course_share(uuid) from public;

grant execute on function public.get_shared_course(text) to anon, authenticated, service_role;
grant execute on function public.get_shared_place_poll(text, text) to anon, authenticated, service_role;
grant execute on function public.vote_shared_place_poll(text, uuid, text, text) to anon, authenticated, service_role;

grant execute on function public.close_place_poll(uuid, uuid) to authenticated, service_role;
grant execute on function public.create_course_share(text, text, text, jsonb, text, timestamptz) to authenticated, service_role;
grant execute on function public.create_place_poll(text, jsonb) to authenticated, service_role;
grant execute on function public.list_my_course_shares() to authenticated, service_role;
grant execute on function public.record_user_legal_consents(text, text, text) to authenticated, service_role;
grant execute on function public.revoke_course_share(uuid) to authenticated, service_role;
