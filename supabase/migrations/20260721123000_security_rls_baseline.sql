-- KO-PICK adaptive RLS baseline
-- Applies policies only when expected ownership columns exist.
-- Safe to run repeatedly.

create or replace function public.is_active_couple_member(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_members cm
    where cm.couple_space_id = target_space_id
      and cm.user_id = auth.uid()
      and coalesce(cm.status, 'active') = 'active'
  );
$$;

revoke all on function public.is_active_couple_member(uuid) from public;
grant execute on function public.is_active_couple_member(uuid) to authenticated;

-- profiles: owner-only access by id or user_id.
do $$
begin
  if to_regclass('public.profiles') is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id') then
      execute 'alter table public.profiles enable row level security';
      execute 'drop policy if exists profiles_select_own on public.profiles';
      execute 'drop policy if exists profiles_insert_own on public.profiles';
      execute 'drop policy if exists profiles_update_own on public.profiles';
      execute 'drop policy if exists profiles_delete_own on public.profiles';
      execute 'create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid())';
      execute 'create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid())';
      execute 'create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid())';
      execute 'create policy profiles_delete_own on public.profiles for delete to authenticated using (id = auth.uid())';
    elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='user_id') then
      execute 'alter table public.profiles enable row level security';
      execute 'drop policy if exists profiles_select_own on public.profiles';
      execute 'drop policy if exists profiles_insert_own on public.profiles';
      execute 'drop policy if exists profiles_update_own on public.profiles';
      execute 'drop policy if exists profiles_delete_own on public.profiles';
      execute 'create policy profiles_select_own on public.profiles for select to authenticated using (user_id = auth.uid())';
      execute 'create policy profiles_insert_own on public.profiles for insert to authenticated with check (user_id = auth.uid())';
      execute 'create policy profiles_update_own on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
      execute 'create policy profiles_delete_own on public.profiles for delete to authenticated using (user_id = auth.uid())';
    else
      raise warning 'profiles exists but no id/user_id ownership column was found; RLS was not changed';
    end if;
  end if;
end $$;

-- couple_members: a user may read members of an active space, but may only create/update/delete their own membership row.
do $$
begin
  if to_regclass('public.couple_members') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='couple_members' and column_name='couple_space_id')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='couple_members' and column_name='user_id') then
    execute 'alter table public.couple_members enable row level security';
    execute 'drop policy if exists couple_members_select_space on public.couple_members';
    execute 'drop policy if exists couple_members_insert_self on public.couple_members';
    execute 'drop policy if exists couple_members_update_self on public.couple_members';
    execute 'drop policy if exists couple_members_delete_self on public.couple_members';
    execute 'create policy couple_members_select_space on public.couple_members for select to authenticated using (user_id = auth.uid() or public.is_active_couple_member(couple_space_id))';
    execute 'create policy couple_members_insert_self on public.couple_members for insert to authenticated with check (user_id = auth.uid())';
    execute 'create policy couple_members_update_self on public.couple_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
    execute 'create policy couple_members_delete_self on public.couple_members for delete to authenticated using (user_id = auth.uid())';
  end if;
end $$;

-- couple_spaces: active members can read; creator owns mutations when created_by exists.
do $$
begin
  if to_regclass('public.couple_spaces') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='couple_spaces' and column_name='id') then
    execute 'alter table public.couple_spaces enable row level security';
    execute 'drop policy if exists couple_spaces_select_member on public.couple_spaces';
    execute 'create policy couple_spaces_select_member on public.couple_spaces for select to authenticated using (public.is_active_couple_member(id))';
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='couple_spaces' and column_name='created_by') then
      execute 'drop policy if exists couple_spaces_insert_creator on public.couple_spaces';
      execute 'drop policy if exists couple_spaces_update_creator on public.couple_spaces';
      execute 'drop policy if exists couple_spaces_delete_creator on public.couple_spaces';
      execute 'create policy couple_spaces_insert_creator on public.couple_spaces for insert to authenticated with check (created_by = auth.uid())';
      execute 'create policy couple_spaces_update_creator on public.couple_spaces for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid())';
      execute 'create policy couple_spaces_delete_creator on public.couple_spaces for delete to authenticated using (created_by = auth.uid())';
    end if;
  end if;
end $$;

-- Shared couple data: active members only.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['anniversaries','couple_events','saved_places','couple_invitations'] loop
    if to_regclass('public.' || table_name) is not null
       and exists (select 1 from information_schema.columns where table_schema='public' and table_name=table_name and column_name='couple_space_id') then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_select_member', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_insert_member', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_update_member', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_delete_member', table_name);
      execute format('create policy %I on public.%I for select to authenticated using (public.is_active_couple_member(couple_space_id))', table_name || '_select_member', table_name);
      execute format('create policy %I on public.%I for insert to authenticated with check (public.is_active_couple_member(couple_space_id))', table_name || '_insert_member', table_name);
      execute format('create policy %I on public.%I for update to authenticated using (public.is_active_couple_member(couple_space_id)) with check (public.is_active_couple_member(couple_space_id))', table_name || '_update_member', table_name);
      execute format('create policy %I on public.%I for delete to authenticated using (public.is_active_couple_member(couple_space_id))', table_name || '_delete_member', table_name);
    end if;
  end loop;
end $$;

-- Owner-only tables with user_id.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['user_preferences','account_deletion_requests'] loop
    if to_regclass('public.' || table_name) is not null
       and exists (select 1 from information_schema.columns where table_schema='public' and table_name=table_name and column_name='user_id') then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_owner_all', table_name);
      execute format('create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', table_name || '_owner_all', table_name);
    end if;
  end loop;
end $$;

-- Report public tables where RLS remains disabled.
select schemaname, tablename
from pg_tables
where schemaname = 'public'
  and rowsecurity = false
order by tablename;
