create extension if not exists pgcrypto with schema extensions;

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  invite_code_hash text,
  invite_expires_at timestamptz,
  invite_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  role text not null check (role in ('creator', 'partner')),
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id),
  unique (user_id)
);

create table if not exists public.couple_anniversaries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  anniversary_date date not null,
  repeats_yearly boolean not null default true,
  note text check (note is null or char_length(note) <= 500),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.couple_calendar_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text check (location is null or char_length(location) <= 160),
  note text check (note is null or char_length(note) <= 1000),
  color text not null default 'red' check (color in ('red', 'blue', 'lime', 'pink', 'black')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index if not exists couple_members_couple_idx
  on public.couple_members (couple_id, joined_at);
create unique index if not exists couples_invite_code_hash_idx
  on public.couples (invite_code_hash)
  where invite_code_hash is not null;
create index if not exists couple_anniversaries_couple_date_idx
  on public.couple_anniversaries (couple_id, anniversary_date);
create index if not exists couple_calendar_events_couple_start_idx
  on public.couple_calendar_events (couple_id, starts_at);

create or replace function public.is_couple_member(target_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_members cm
    where cm.couple_id = target_couple_id
      and cm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_couple_member(uuid) from public;
grant execute on function public.is_couple_member(uuid) to authenticated;

create or replace function public.create_couple_space(
  display_name_input text default '나'
)
returns table (
  couple_id uuid,
  invite_code text,
  invite_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_invite_code text;
  v_invite_hash text;
  v_expires_at timestamptz := now() + interval '24 hours';
  v_display_name text := nullif(trim(display_name_input), '');
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if v_display_name is null or char_length(v_display_name) > 24 then
    raise exception '닉네임은 1자 이상 24자 이하로 입력해 주세요.';
  end if;

  if exists (
    select 1 from public.couple_members cm where cm.user_id = v_user_id
  ) then
    raise exception '이미 연결된 커플 공간이 있습니다.';
  end if;

  v_invite_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  v_invite_hash := encode(digest(v_invite_code, 'sha256'), 'hex');

  insert into public.couples (
    created_by,
    invite_code_hash,
    invite_expires_at
  ) values (
    v_user_id,
    v_invite_hash,
    v_expires_at
  )
  returning id into v_couple_id;

  insert into public.couple_members (
    couple_id,
    user_id,
    display_name,
    role
  ) values (
    v_couple_id,
    v_user_id,
    v_display_name,
    'creator'
  );

  return query select v_couple_id, v_invite_code, v_expires_at;
end;
$$;

revoke all on function public.create_couple_space(text) from public;
grant execute on function public.create_couple_space(text) to authenticated;

create or replace function public.join_couple_space(
  invite_code_input text,
  display_name_input text default '파트너'
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_invite_hash text;
  v_display_name text := nullif(trim(display_name_input), '');
  v_member_count integer;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if v_display_name is null or char_length(v_display_name) > 24 then
    raise exception '닉네임은 1자 이상 24자 이하로 입력해 주세요.';
  end if;

  if exists (
    select 1 from public.couple_members cm where cm.user_id = v_user_id
  ) then
    raise exception '이미 연결된 커플 공간이 있습니다.';
  end if;

  if upper(trim(invite_code_input)) !~ '^[0-9A-F]{8}$' then
    raise exception '초대 코드는 영문 대문자와 숫자로 된 8자리입니다.';
  end if;

  v_invite_hash := encode(
    digest(upper(trim(invite_code_input)), 'sha256'),
    'hex'
  );

  select c.id
  into v_couple_id
  from public.couples c
  where c.invite_code_hash = v_invite_hash
    and c.invite_used_at is null
    and c.invite_expires_at > now()
  for update;

  if v_couple_id is null then
    raise exception '초대 코드가 올바르지 않거나 만료되었습니다.';
  end if;

  select count(*)
  into v_member_count
  from public.couple_members cm
  where cm.couple_id = v_couple_id;

  if v_member_count >= 2 then
    raise exception '이미 두 사람이 연결된 커플 공간입니다.';
  end if;

  insert into public.couple_members (
    couple_id,
    user_id,
    display_name,
    role
  ) values (
    v_couple_id,
    v_user_id,
    v_display_name,
    'partner'
  );

  update public.couples
  set
    invite_used_at = now(),
    invite_code_hash = null,
    invite_expires_at = null,
    updated_at = now()
  where id = v_couple_id;

  return v_couple_id;
end;
$$;

revoke all on function public.join_couple_space(text, text) from public;
grant execute on function public.join_couple_space(text, text) to authenticated;

create or replace function public.refresh_couple_invite()
returns table (
  invite_code text,
  invite_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_member_count integer;
  v_invite_code text;
  v_invite_hash text;
  v_expires_at timestamptz := now() + interval '24 hours';
begin
  select c.id
  into v_couple_id
  from public.couples c
  where c.created_by = v_user_id
  for update;

  if v_couple_id is null then
    raise exception '초대 코드를 만들 권한이 없습니다.';
  end if;

  select count(*)
  into v_member_count
  from public.couple_members cm
  where cm.couple_id = v_couple_id;

  if v_member_count >= 2 then
    raise exception '이미 두 사람이 연결되어 있습니다.';
  end if;

  v_invite_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  v_invite_hash := encode(digest(v_invite_code, 'sha256'), 'hex');

  update public.couples
  set
    invite_code_hash = v_invite_hash,
    invite_expires_at = v_expires_at,
    invite_used_at = null,
    updated_at = now()
  where id = v_couple_id;

  return query select v_invite_code, v_expires_at;
end;
$$;

revoke all on function public.refresh_couple_invite() from public;
grant execute on function public.refresh_couple_invite() to authenticated;

create or replace function public.get_my_couple()
returns table (
  couple_id uuid,
  member_role text,
  member_count bigint,
  invite_expires_at timestamptz,
  invite_used boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    me.role,
    count(m.user_id),
    c.invite_expires_at,
    c.invite_used_at is not null,
    c.created_at
  from public.couple_members me
  join public.couples c on c.id = me.couple_id
  join public.couple_members m on m.couple_id = c.id
  where me.user_id = auth.uid()
  group by c.id, me.role, c.invite_expires_at, c.invite_used_at, c.created_at;
$$;

revoke all on function public.get_my_couple() from public;
grant execute on function public.get_my_couple() to authenticated;

create or replace function public.set_couple_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists couple_anniversaries_set_updated_at
  on public.couple_anniversaries;
create trigger couple_anniversaries_set_updated_at
before update on public.couple_anniversaries
for each row execute function public.set_couple_updated_at();

drop trigger if exists couple_calendar_events_set_updated_at
  on public.couple_calendar_events;
create trigger couple_calendar_events_set_updated_at
before update on public.couple_calendar_events
for each row execute function public.set_couple_updated_at();

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.couple_anniversaries enable row level security;
alter table public.couple_calendar_events enable row level security;

drop policy if exists "couple members can read couple" on public.couples;
create policy "couple members can read couple"
  on public.couples
  for select
  to authenticated
  using ((select public.is_couple_member(id)));

drop policy if exists "couple members can read members" on public.couple_members;
create policy "couple members can read members"
  on public.couple_members
  for select
  to authenticated
  using ((select public.is_couple_member(couple_id)));

drop policy if exists "couple members can read anniversaries" on public.couple_anniversaries;
create policy "couple members can read anniversaries"
  on public.couple_anniversaries
  for select
  to authenticated
  using ((select public.is_couple_member(couple_id)));

drop policy if exists "couple members can add anniversaries" on public.couple_anniversaries;
create policy "couple members can add anniversaries"
  on public.couple_anniversaries
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and (select public.is_couple_member(couple_id))
  );

drop policy if exists "couple members can edit anniversaries" on public.couple_anniversaries;
create policy "couple members can edit anniversaries"
  on public.couple_anniversaries
  for update
  to authenticated
  using ((select public.is_couple_member(couple_id)))
  with check ((select public.is_couple_member(couple_id)));

drop policy if exists "couple members can delete anniversaries" on public.couple_anniversaries;
create policy "couple members can delete anniversaries"
  on public.couple_anniversaries
  for delete
  to authenticated
  using ((select public.is_couple_member(couple_id)));

drop policy if exists "couple members can read events" on public.couple_calendar_events;
create policy "couple members can read events"
  on public.couple_calendar_events
  for select
  to authenticated
  using ((select public.is_couple_member(couple_id)));

drop policy if exists "couple members can add events" on public.couple_calendar_events;
create policy "couple members can add events"
  on public.couple_calendar_events
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and (select public.is_couple_member(couple_id))
  );

drop policy if exists "couple members can edit events" on public.couple_calendar_events;
create policy "couple members can edit events"
  on public.couple_calendar_events
  for update
  to authenticated
  using ((select public.is_couple_member(couple_id)))
  with check ((select public.is_couple_member(couple_id)));

drop policy if exists "couple members can delete events" on public.couple_calendar_events;
create policy "couple members can delete events"
  on public.couple_calendar_events
  for delete
  to authenticated
  using ((select public.is_couple_member(couple_id)));

revoke all on public.couples from anon, authenticated;
revoke all on public.couple_members from anon, authenticated;
revoke all on public.couple_anniversaries from anon, authenticated;
revoke all on public.couple_calendar_events from anon, authenticated;

grant select on public.couples, public.couple_members to authenticated;
grant select, insert, update, delete
  on public.couple_anniversaries, public.couple_calendar_events
  to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.couple_members;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.couple_anniversaries;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.couple_calendar_events;
exception when duplicate_object then null;
end $$;
