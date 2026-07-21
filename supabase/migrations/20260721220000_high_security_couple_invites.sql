-- KO-PICK high-security couple invite and RLS hardening
-- Safe to re-run. Uses the actual production table names discovered in Supabase.

create extension if not exists pgcrypto;

-- Invite lifecycle fields. Raw invite codes are never stored.
alter table if exists public.couples
  add column if not exists invite_expires_at timestamptz,
  add column if not exists invite_revoked_at timestamptz;

-- Existing unused invites receive a short migration grace period.
update public.couples
set invite_expires_at = coalesce(invite_expires_at, now() + interval '24 hours')
where invite_code_hash is not null
  and invite_used_at is null
  and invite_revoked_at is null;

-- Every new/rotated hash receives a fresh 24-hour lifetime and becomes unused.
create or replace function public.secure_couple_invite_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' or new.invite_code_hash is distinct from old.invite_code_hash then
    new.invite_used_at := null;
    new.invite_revoked_at := null;
    new.invite_expires_at := now() + interval '24 hours';
  end if;
  return new;
end;
$$;

revoke all on function public.secure_couple_invite_lifecycle() from public;

drop trigger if exists trg_secure_couple_invite_lifecycle on public.couples;
create trigger trg_secure_couple_invite_lifecycle
before insert or update of invite_code_hash on public.couples
for each row execute function public.secure_couple_invite_lifecycle();

-- Per-account database rate-limit ledger. IP limiting must also be enforced at the API/WAF layer.
create table if not exists public.couple_invite_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null default false
);

create index if not exists couple_invite_attempts_user_time_idx
  on public.couple_invite_attempts (user_id, attempted_at desc);

alter table public.couple_invite_attempts enable row level security;
revoke all on table public.couple_invite_attempts from anon, authenticated;

-- Secure replacement RPC. Frontend should call join_couple_space_secure instead of the legacy RPC.
-- Returns the claimed couple id. Exactly one transaction can claim a code.
create or replace function public.join_couple_space_secure(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite_hash text;
  v_couple_id uuid;
  v_attempt_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_invite_code is null or length(trim(p_invite_code)) < 12 or length(trim(p_invite_code)) > 128 then
    raise exception 'Invalid invite code' using errcode = '22023';
  end if;

  select count(*) into v_attempt_count
  from public.couple_invite_attempts
  where user_id = v_user_id
    and attempted_at >= now() - interval '15 minutes';

  if v_attempt_count >= 10 then
    raise exception 'Too many attempts. Try again later.' using errcode = 'P0001';
  end if;

  insert into public.couple_invite_attempts(user_id, succeeded)
  values (v_user_id, false);

  v_invite_hash := encode(digest(upper(trim(p_invite_code)), 'sha256'), 'hex');

  -- Atomic claim prevents two users from accepting the same invite concurrently.
  update public.couples c
     set invite_used_at = now(),
         invite_revoked_at = now()
   where c.invite_code_hash = v_invite_hash
     and c.invite_used_at is null
     and c.invite_revoked_at is null
     and c.invite_expires_at > now()
     and not exists (
       select 1 from public.couple_members self_member
       where self_member.couple_id = c.id
         and self_member.user_id = v_user_id
     )
     and (select count(*) from public.couple_members cm where cm.couple_id = c.id) < 2
  returning c.id into v_couple_id;

  if v_couple_id is null then
    raise exception 'Invite is invalid, expired, used, or unavailable' using errcode = 'P0001';
  end if;

  -- A user may belong to only one active couple. Lock relevant rows to avoid races.
  if exists (
    select 1 from public.couple_members cm
    where cm.user_id = v_user_id
      and coalesce(cm.status, 'active') = 'active'
  ) then
    raise exception 'User already belongs to an active couple' using errcode = 'P0001';
  end if;

  insert into public.couple_members(couple_id, user_id, status)
  values (v_couple_id, v_user_id, 'active')
  on conflict do nothing;

  update public.couple_invite_attempts
     set succeeded = true
   where ctid = (
     select ctid from public.couple_invite_attempts
     where user_id = v_user_id
     order by attempted_at desc
     limit 1
   );

  return v_couple_id;
end;
$$;

revoke all on function public.join_couple_space_secure(text) from public, anon;
grant execute on function public.join_couple_space_secure(text) to authenticated;

-- Membership helpers using the real schema.
create or replace function public.is_couple_member(target_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.couple_members cm
    where cm.couple_id = target_couple_id
      and cm.user_id = auth.uid()
      and coalesce(cm.status, 'active') = 'active'
  );
$$;

revoke all on function public.is_couple_member(uuid) from public, anon;
grant execute on function public.is_couple_member(uuid) to authenticated;

-- Actual production table RLS.
alter table if exists public.couples enable row level security;
alter table if exists public.couple_members enable row level security;
alter table if exists public.couple_anniversaries enable row level security;
alter table if exists public.couple_calendar_events enable row level security;

-- Remove only KO-PICK high-security policy names, preserving unrelated admin policies.
drop policy if exists couples_member_select_v2 on public.couples;
drop policy if exists couples_creator_insert_v2 on public.couples;
drop policy if exists couples_creator_update_v2 on public.couples;
drop policy if exists couples_creator_delete_v2 on public.couples;

create policy couples_member_select_v2 on public.couples
for select to authenticated
using (public.is_couple_member(id));

-- Install creator policies only when created_by exists.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='couples'
      and column_name='created_by' and udt_name='uuid'
  ) then
    execute 'create policy couples_creator_insert_v2 on public.couples for insert to authenticated with check (created_by = auth.uid())';
    execute 'create policy couples_creator_update_v2 on public.couples for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid())';
    execute 'create policy couples_creator_delete_v2 on public.couples for delete to authenticated using (created_by = auth.uid())';
  end if;
end $$;

drop policy if exists couple_members_member_select_v2 on public.couple_members;
drop policy if exists couple_members_self_insert_v2 on public.couple_members;
drop policy if exists couple_members_self_update_v2 on public.couple_members;
drop policy if exists couple_members_self_delete_v2 on public.couple_members;

create policy couple_members_member_select_v2 on public.couple_members
for select to authenticated
using (user_id = auth.uid() or public.is_couple_member(couple_id));
create policy couple_members_self_insert_v2 on public.couple_members
for insert to authenticated with check (user_id = auth.uid());
create policy couple_members_self_update_v2 on public.couple_members
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy couple_members_self_delete_v2 on public.couple_members
for delete to authenticated using (user_id = auth.uid());

-- Shared data tables are active-member only.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['couple_anniversaries','couple_calendar_events'] loop
    if to_regclass('public.' || v_table) is not null
       and exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name=v_table
           and column_name='couple_id' and udt_name='uuid'
       ) then
      execute format('drop policy if exists %I on public.%I', v_table || '_member_select_v2', v_table);
      execute format('drop policy if exists %I on public.%I', v_table || '_member_insert_v2', v_table);
      execute format('drop policy if exists %I on public.%I', v_table || '_member_update_v2', v_table);
      execute format('drop policy if exists %I on public.%I', v_table || '_member_delete_v2', v_table);
      execute format('create policy %I on public.%I for select to authenticated using (public.is_couple_member(couple_id))', v_table || '_member_select_v2', v_table);
      execute format('create policy %I on public.%I for insert to authenticated with check (public.is_couple_member(couple_id))', v_table || '_member_insert_v2', v_table);
      execute format('create policy %I on public.%I for update to authenticated using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id))', v_table || '_member_update_v2', v_table);
      execute format('create policy %I on public.%I for delete to authenticated using (public.is_couple_member(couple_id))', v_table || '_member_delete_v2', v_table);
    end if;
  end loop;
end $$;

-- Prevent accidental direct exposure of invite hashes to browser roles.
revoke select (invite_code_hash, invite_expires_at, invite_used_at, invite_revoked_at)
  on public.couples from anon, authenticated;

-- Audit output after deployment.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('couples','couple_members','couple_anniversaries','couple_calendar_events')
order by tablename, policyname;
