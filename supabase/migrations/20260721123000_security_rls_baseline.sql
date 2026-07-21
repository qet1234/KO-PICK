-- KO-PICK adaptive RLS baseline
-- Policies are installed only when the required ownership columns exist.
-- Re-running this migration is safe.

create or replace function public.is_active_couple_member(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select false $$;

-- Replace the safe default helper only when the membership schema is compatible.
do $$
begin
  if to_regclass('public.couple_members') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='couple_members' and column_name='couple_space_id')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='couple_members' and column_name='user_id') then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='couple_members' and column_name='status') then
      execute $fn$
        create or replace function public.is_active_couple_member(target_space_id uuid)
        returns boolean language sql stable security definer set search_path = public
        as $body$
          select exists (
            select 1 from public.couple_members cm
            where cm.couple_space_id = target_space_id
              and cm.user_id = auth.uid()
              and cm.status = 'active'
          )
        $body$
      $fn$;
    else
      execute $fn$
        create or replace function public.is_active_couple_member(target_space_id uuid)
        returns boolean language sql stable security definer set search_path = public
        as $body$
          select exists (
            select 1 from public.couple_members cm
            where cm.couple_space_id = target_space_id
              and cm.user_id = auth.uid()
          )
        $body$
      $fn$;
    end if;
  else
    raise warning 'couple_members schema is incompatible; couple RLS policies were not installed';
  end if;
end $$;

revoke all on function public.is_active_couple_member(uuid) from public;
grant execute on function public.is_active_couple_member(uuid) to authenticated;

-- profiles: owner-only access by id or user_id.
do $$
begin
  if to_regclass('public.profiles') is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id' and udt_name='uuid') then
      alter table public.profiles enable row level security;
      drop policy if exists profiles_select_own on public.profiles;
      drop policy if exists profiles_insert_own on public.profiles;
      drop policy if exists profiles_update_own on public.profiles;
      drop policy if exists profiles_delete_own on public.profiles;
      create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
      create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
      create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
      create policy profiles_delete_own on public.profiles for delete to authenticated using (id = auth.uid());
    elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='user_id' and udt_name='uuid') then
      alter table public.profiles enable row level security;
      drop policy if exists profiles_select_own on public.profiles;
      drop policy if exists profiles_insert_own on public.profiles;
      drop policy if exists profiles_update_own on public.profiles;
      drop policy if exists profiles_delete_own on public.profiles;
      create policy profiles_select_own on public.profiles for select to authenticated using (user_id = auth.uid());
      create policy profiles_insert_own on public.profiles for insert to authenticated with check (user_id = auth.uid());
      create policy profiles_update_own on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
      create policy profiles_delete_own on public.profiles for delete to authenticated using (user_id = auth.uid());
    else
      raise warning 'profiles exists but no UUID id/user_id ownership column was found; RLS was not changed';
    end if;
  end if;
end $$;

-- couple_members: active-space reads; self-only membership mutations.
do $$
begin
  if to_regclass('public.couple_members') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='couple_members' and column_name='couple_space_id' and udt_name='uuid')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='couple_members' and column_name='user_id' and udt_name='uuid') then
    alter table public.couple_members enable row level security;
    drop policy if exists couple_members_select_space on public.couple_members;
    drop policy if exists couple_members_insert_self on public.couple_members;
    drop policy if exists couple_members_update_self on public.couple_members;
    drop policy if exists couple_members_delete_self on public.couple_members;
    create policy couple_members_select_space on public.couple_members for select to authenticated
      using (user_id = auth.uid() or public.is_active_couple_member(couple_space_id));
    create policy couple_members_insert_self on public.couple_members for insert to authenticated
      with check (user_id = auth.uid());
    create policy couple_members_update_self on public.couple_members for update to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy couple_members_delete_self on public.couple_members for delete to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

-- couple_spaces: active members can read; creator owns mutations.
do $$
begin
  if to_regclass('public.couple_spaces') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='couple_spaces' and column_name='id' and udt_name='uuid') then
    alter table public.couple_spaces enable row level security;
    drop policy if exists couple_spaces_select_member on public.couple_spaces;
    create policy couple_spaces_select_member on public.couple_spaces for select to authenticated
      using (public.is_active_couple_member(id));
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='couple_spaces' and column_name='created_by' and udt_name='uuid') then
      drop policy if exists couple_spaces_insert_creator on public.couple_spaces;
      drop policy if exists couple_spaces_update_creator on public.couple_spaces;
      drop policy if exists couple_spaces_delete_creator on public.couple_spaces;
      create policy couple_spaces_insert_creator on public.couple_spaces for insert to authenticated with check (created_by = auth.uid());
      create policy couple_spaces_update_creator on public.couple_spaces for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
      create policy couple_spaces_delete_creator on public.couple_spaces for delete to authenticated using (created_by = auth.uid());
    end if;
  end if;
end $$;

-- Shared couple data: active members only.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['anniversaries','couple_events','saved_places','couple_invitations'] loop
    if to_regclass('public.' || v_table) is not null
       and exists (
         select 1 from information_schema.columns c
         where c.table_schema='public' and c.table_name=v_table
           and c.column_name='couple_space_id' and c.udt_name='uuid'
       ) then
      execute format('alter table public.%I enable row level security', v_table);
      execute format('drop policy if exists %I on public.%I', v_table || '_select_member', v_table);
      execute format('drop policy if exists %I on public.%I', v_table || '_insert_member', v_table);
      execute format('drop policy if exists %I on public.%I', v_table || '_update_member', v_table);
      execute format('drop policy if exists %I on public.%I', v_table || '_delete_member', v_table);
      execute format('create policy %I on public.%I for select to authenticated using (public.is_active_couple_member(couple_space_id))', v_table || '_select_member', v_table);
      execute format('create policy %I on public.%I for insert to authenticated with check (public.is_active_couple_member(couple_space_id))', v_table || '_insert_member', v_table);
      execute format('create policy %I on public.%I for update to authenticated using (public.is_active_couple_member(couple_space_id)) with check (public.is_active_couple_member(couple_space_id))', v_table || '_update_member', v_table);
      execute format('create policy %I on public.%I for delete to authenticated using (public.is_active_couple_member(couple_space_id))', v_table || '_delete_member', v_table);
    end if;
  end loop;
end $$;

-- Owner-only tables with user_id.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['user_preferences','account_deletion_requests'] loop
    if to_regclass('public.' || v_table) is not null
       and exists (
         select 1 from information_schema.columns c
         where c.table_schema='public' and c.table_name=v_table
           and c.column_name='user_id' and c.udt_name='uuid'
       ) then
      execute format('alter table public.%I enable row level security', v_table);
      execute format('drop policy if exists %I on public.%I', v_table || '_owner_all', v_table);
      execute format('create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', v_table || '_owner_all', v_table);
    end if;
  end loop;
end $$;

-- Deployment audit: this result must be reviewed after applying the migration.
select schemaname, tablename
from pg_tables
where schemaname = 'public' and rowsecurity = false
order by tablename;
