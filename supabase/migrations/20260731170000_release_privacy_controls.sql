-- Release privacy controls:
-- 1. Preserve shared spaces by transferring ownership before account deletion.
-- 2. Remove account-linked and device-linked activity records.
-- 3. Provide a server-side retention cleanup for 90-day activity records.

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('privacy', 'account-deletion', 'copyright', 'service')),
  email text not null check (char_length(email) between 3 and 254),
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'in-progress', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

alter table public.support_requests enable row level security;
revoke all on public.support_requests from public, anon, authenticated;
grant all on public.support_requests to service_role;

create index if not exists support_requests_status_created_idx
  on public.support_requests(status, created_at);

create or replace function public.prepare_account_deletion(
  p_user_id uuid,
  p_visitor_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
  successor uuid;
begin
  if p_user_id is null then
    raise exception '삭제할 사용자 정보가 없습니다.';
  end if;

  -- A group space with another member survives the owner's withdrawal.
  for target in
    select s.id
    from public.spaces s
    where s.created_by = p_user_id
      and s.space_type <> 'personal'
    for update
  loop
    select sm.user_id
    into successor
    from public.space_members sm
    where sm.space_id = target.id
      and sm.user_id <> p_user_id
    order by sm.joined_at, sm.user_id
    limit 1;

    if successor is not null then
      update public.spaces
      set created_by = successor,
          updated_at = now()
      where id = target.id;

      update public.space_members
      set role = case when user_id = successor then 'owner' else 'member' end
      where space_id = target.id;

      delete from public.space_members
      where space_id = target.id
        and user_id = p_user_id;
    end if;
  end loop;

  -- Leave group spaces owned by somebody else.
  delete from public.space_members sm
  using public.spaces s
  where sm.space_id = s.id
    and sm.user_id = p_user_id
    and s.space_type <> 'personal'
    and s.created_by <> p_user_id;

  -- Keep legacy couple data for the remaining member when possible.
  if to_regclass('public.couples') is not null
     and to_regclass('public.couple_members') is not null then
    for target in
      execute 'select id from public.couples where created_by = $1 for update'
      using p_user_id
    loop
      successor := null;
      execute
        'select user_id from public.couple_members
          where couple_id = $1 and user_id <> $2
          order by joined_at, user_id limit 1'
        into successor
        using target.id, p_user_id;

      if successor is not null then
        execute
          'update public.couples set created_by = $1, updated_at = now() where id = $2'
          using successor, target.id;
        execute
          'delete from public.couple_members where couple_id = $1 and user_id = $2'
          using target.id, p_user_id;
      end if;
    end loop;
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

create or replace function public.prune_service_activity_events()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if to_regclass('public.place_activity_events') is not null then
    delete from public.place_activity_events
    where created_at < now() - interval '90 days';
  end if;

  if to_regclass('public.keyword_search_events') is not null then
    delete from public.keyword_search_events
    where created_at < now() - interval '90 days';
  end if;
end;
$$;

revoke all on function public.prepare_account_deletion(uuid, text)
  from public, anon, authenticated;
revoke all on function public.prune_service_activity_events()
  from public, anon, authenticated;

grant execute on function public.prepare_account_deletion(uuid, text)
  to service_role;
grant execute on function public.prune_service_activity_events()
  to service_role;

create index if not exists place_activity_events_visitor_idx
  on public.place_activity_events(visitor_id, created_at desc);
create index if not exists keyword_search_events_visitor_idx
  on public.keyword_search_events(visitor_id, created_at desc);
