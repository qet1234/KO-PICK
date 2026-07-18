-- Ensure authenticated clients can discover and execute the couple-space RPCs.
-- PostgREST normally reloads automatically after DDL, but an explicit reload
-- avoids a stale schema cache after applying the migration in SQL Editor.

grant usage on schema public to authenticated;
grant execute on function public.create_couple_space(text) to authenticated;
grant execute on function public.join_couple_space(text, text) to authenticated;
grant execute on function public.refresh_couple_invite() to authenticated;
grant execute on function public.get_my_couple() to authenticated;

notify pgrst, 'reload schema';
