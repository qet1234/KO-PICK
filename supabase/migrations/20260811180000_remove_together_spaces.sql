-- Permanently remove the discontinued Together Spaces feature and its data.
-- Historical migrations stay immutable so existing projects can migrate safely.

drop function if exists public.prepare_account_deletion(uuid, text);

do $drop_functions$
declare
  target record;
begin
  for target in
    select
      namespace.nspname as schema_name,
      procedure.proname as function_name,
      pg_get_function_identity_arguments(procedure.oid) as arguments
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('public', 'private')
      and procedure.proname in (
        'ensure_personal_space',
        'list_my_spaces',
        'list_my_spaces_with_legacy_couple',
        'create_shared_space',
        'create_shared_space_with_legacy_couple',
        'refresh_space_invite',
        'refresh_space_invite_with_legacy_couple',
        'join_shared_space',
        'join_shared_space_with_legacy_couple',
        'leave_shared_space',
        'list_my_reservations',
        'list_my_reservations_with_legacy_couple',
        'create_reservation_plan',
        'add_reservation_candidate',
        'toggle_reservation_vote',
        'finalize_reservation_plan',
        'update_reservation_status',
        'delete_reservation_plan',
        'create_couple_space',
        'join_couple_space',
        'join_couple_space_secure',
        'refresh_couple_invite',
        'get_my_couple',
        'leave_couple_space',
        'is_couple_member',
        'is_active_couple_member',
        'secure_couple_invite_lifecycle',
        'set_couple_updated_at',
        'is_space_member',
        'is_space_owner'
      )
  loop
    execute format(
      'drop function if exists %I.%I(%s) cascade',
      target.schema_name,
      target.function_name,
      target.arguments
    );
  end loop;
end;
$drop_functions$;

do $drop_tables$
declare
  table_name text;
begin
  foreach table_name in array array[
    'space_reservation_votes',
    'space_reservation_candidates',
    'space_calendar_events',
    'space_reservation_plans',
    'space_milestones',
    'space_invite_attempts',
    'space_members',
    'spaces',
    'couple_invite_attempts',
    'couple_calendar_events',
    'couple_anniversaries',
    'couple_members',
    'couples',
    'couple_invitations',
    'couple_events',
    'anniversaries',
    'saved_places',
    'couple_spaces'
  ]
  loop
    execute format('drop table if exists public.%I cascade', table_name);
  end loop;
end;
$drop_tables$;

-- Account deletion remains available after removing all space ownership logic.
create or replace function public.prepare_account_deletion(
  p_user_id uuid,
  p_visitor_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception '삭제할 사용자 정보가 없습니다.';
  end if;

  if to_regclass('public.place_activity_events') is not null then
    delete from public.place_activity_events
    where user_id = p_user_id
       or (
         p_visitor_id is not null
         and p_visitor_id <> ''
         and visitor_id = left(p_visitor_id, 120)
       );
  end if;

  if to_regclass('public.keyword_search_events') is not null then
    delete from public.keyword_search_events
    where user_id = p_user_id
       or (
         p_visitor_id is not null
         and p_visitor_id <> ''
         and visitor_id = left(p_visitor_id, 120)
       );
  end if;

  if to_regclass('public.support_requests') is not null then
    delete from public.support_requests
    where status = 'closed'
      and coalesce(closed_at, created_at) < now() - interval '1 year';
  end if;
end;
$$;

revoke all on function public.prepare_account_deletion(uuid, text)
  from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid, text)
  to service_role;
