-- Disable the user-facing couple-space feature without destroying retained records.
-- Existing rows remain available to service-role account deletion and recovery work.

do $$
begin
  -- Some production projects still use only the legacy public.couples table.
  if to_regclass('public.spaces') is not null then
    execute '
      update public.spaces
      set invite_code_hash = null,
          invite_expires_at = null,
          invite_used_at = coalesce(invite_used_at, now()),
          invite_revoked_at = coalesce(invite_revoked_at, now()),
          updated_at = now()
      where space_type = ''couple''';
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.couples') is not null then
    execute '
      update public.couples
      set invite_code_hash = null,
          invite_expires_at = null,
          invite_used_at = coalesce(invite_used_at, now()),
          updated_at = now()';
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'couples'
        and column_name = 'invite_revoked_at'
    ) then
      -- The optional high-security lifecycle trigger resets timestamps when the
      -- hash changes. Normalize them again after the hash has been removed.
      execute '
        update public.couples
        set invite_expires_at = null,
            invite_used_at = coalesce(invite_used_at, now()),
            invite_revoked_at = coalesce(invite_revoked_at, now()),
            updated_at = now()
        where invite_code_hash is null';
    end if;
  end if;
end;
$$;

-- Delete the original dedicated couple-space API functions. Retained tables are
-- intentionally kept for account deletion and controlled recovery only.
drop function if exists public.create_couple_space(text);
drop function if exists public.join_couple_space(text, text);
drop function if exists public.join_couple_space_secure(text);
drop function if exists public.refresh_couple_invite();
drop function if exists public.get_my_couple();
drop function if exists public.leave_couple_space();
do $$
begin
  if to_regclass('public.couples') is not null then
    execute 'drop trigger if exists trg_secure_couple_invite_lifecycle on public.couples';
  end if;
end;
$$;
drop function if exists public.secure_couple_invite_lifecycle();

create or replace function public.is_couple_member(target_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false;
$$;

create or replace function public.is_active_couple_member(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false;
$$;

-- Newer projects also have the generic shared-space schema. Apply its stronger
-- filtering wrappers only when that schema is present; legacy-only production
-- projects still complete the dedicated couple RPC removal above.
do $generic$
begin
  if to_regclass('public.spaces') is null
    or to_regclass('public.space_members') is null then
    return;
  end if;

  -- RLS and reservation RPCs must treat retained couple spaces as unavailable.
  execute $ddl$
    create or replace function private.is_space_member(
      target_space_id uuid,
      target_user_id uuid default auth.uid()
    )
    returns boolean
    language sql
    stable
    security definer
    set search_path = ''
    as $body$
      select target_user_id is not null and exists (
        select 1
        from public.space_members me
        join public.spaces s on s.id = me.space_id
        where me.space_id = target_space_id
          and me.user_id = target_user_id
          and s.space_type <> 'couple'
      );
    $body$
  $ddl$;

  execute $ddl$
    create or replace function private.is_space_owner(
      target_space_id uuid,
      target_user_id uuid default auth.uid()
    )
    returns boolean
    language sql
    stable
    security definer
    set search_path = ''
    as $body$
      select target_user_id is not null and exists (
        select 1
        from public.space_members me
        join public.spaces s on s.id = me.space_id
        where me.space_id = target_space_id
          and me.user_id = target_user_id
          and me.role = 'owner'
          and s.space_type <> 'couple'
      );
    $body$
  $ddl$;

  -- Keep the original implementations private so retained records can be recovered.
  -- The guards make the reviewed Management API fallback safe to re-run.
  if to_regprocedure('public.list_my_spaces_with_legacy_couple(text)') is null
    and to_regprocedure('public.list_my_spaces(text)') is not null then
    execute 'alter function public.list_my_spaces(text) rename to list_my_spaces_with_legacy_couple';
  end if;
  if to_regprocedure('public.create_shared_space_with_legacy_couple(text,text,text)') is null
    and to_regprocedure('public.create_shared_space(text,text,text)') is not null then
    execute 'alter function public.create_shared_space(text, text, text) rename to create_shared_space_with_legacy_couple';
  end if;
  if to_regprocedure('public.refresh_space_invite_with_legacy_couple(uuid)') is null
    and to_regprocedure('public.refresh_space_invite(uuid)') is not null then
    execute 'alter function public.refresh_space_invite(uuid) rename to refresh_space_invite_with_legacy_couple';
  end if;
  if to_regprocedure('public.join_shared_space_with_legacy_couple(text,text)') is null
    and to_regprocedure('public.join_shared_space(text,text)') is not null then
    execute 'alter function public.join_shared_space(text, text) rename to join_shared_space_with_legacy_couple';
  end if;
  if to_regprocedure('public.list_my_reservations_with_legacy_couple(uuid)') is null
    and to_regprocedure('public.list_my_reservations(uuid)') is not null then
    execute 'alter function public.list_my_reservations(uuid) rename to list_my_reservations_with_legacy_couple';
  end if;

  -- If the complete generic RPC set is not installed, the legacy removal above
  -- is still valid and there is nothing further to expose or wrap.
  if to_regprocedure('public.list_my_spaces_with_legacy_couple(text)') is null
    or to_regprocedure('public.create_shared_space_with_legacy_couple(text,text,text)') is null
    or to_regprocedure('public.refresh_space_invite_with_legacy_couple(uuid)') is null
    or to_regprocedure('public.join_shared_space_with_legacy_couple(text,text)') is null
    or to_regprocedure('public.list_my_reservations_with_legacy_couple(uuid)') is null then
    return;
  end if;

  execute 'revoke all on function public.list_my_spaces_with_legacy_couple(text) from public, anon, authenticated';
  execute 'revoke all on function public.create_shared_space_with_legacy_couple(text, text, text) from public, anon, authenticated';
  execute 'revoke all on function public.refresh_space_invite_with_legacy_couple(uuid) from public, anon, authenticated';
  execute 'revoke all on function public.join_shared_space_with_legacy_couple(text, text) from public, anon, authenticated';
  execute 'revoke all on function public.list_my_reservations_with_legacy_couple(uuid) from public, anon, authenticated';

  execute $ddl$
    create or replace function public.list_my_spaces(p_display_name text default null)
    returns jsonb
    language plpgsql
    security definer
    set search_path = ''
    as $body$
    declare
      payload jsonb;
      visible_spaces jsonb;
    begin
      payload := public.list_my_spaces_with_legacy_couple(p_display_name);
      select coalesce(jsonb_agg(item), '[]'::jsonb)
      into visible_spaces
      from jsonb_array_elements(coalesce(payload -> 'spaces', '[]'::jsonb)) item
      where item ->> 'space_type' <> 'couple';
      return jsonb_set(payload, '{spaces}', visible_spaces, true);
    end;
    $body$
  $ddl$;

  execute $ddl$
    create or replace function public.create_shared_space(p_type text, p_name text, p_display_name text)
    returns jsonb
    language plpgsql
    security definer
    set search_path = ''
    as $body$
    begin
      if lower(btrim(coalesce(p_type, ''))) = 'couple' then
        return jsonb_build_object('error', '커플 공간 기능은 종료되었습니다.');
      end if;
      return public.create_shared_space_with_legacy_couple(p_type, p_name, p_display_name);
    end;
    $body$
  $ddl$;

  execute $ddl$
    create or replace function public.refresh_space_invite(p_space_id uuid)
    returns jsonb
    language plpgsql
    security definer
    set search_path = ''
    as $body$
    declare
      target_type text;
    begin
      select space_type into target_type from public.spaces where id = p_space_id;
      if target_type = 'couple' then
        return jsonb_build_object('error', '커플 공간 기능은 종료되었습니다.');
      end if;
      return public.refresh_space_invite_with_legacy_couple(p_space_id);
    end;
    $body$
  $ddl$;

  execute $ddl$
    create or replace function public.join_shared_space(p_invite_code text, p_display_name text)
    returns jsonb
    language plpgsql
    security definer
    set search_path = ''
    as $body$
    declare
      code text := upper(regexp_replace(coalesce(p_invite_code, ''), '\s+', '', 'g'));
      target_type text;
    begin
      select space_type into target_type
      from public.spaces
      where invite_code_hash = encode(digest(code, 'sha256'), 'hex')
      limit 1;
      if target_type = 'couple' then
        return jsonb_build_object('error', '커플 공간 기능은 종료되었습니다.');
      end if;
      return public.join_shared_space_with_legacy_couple(p_invite_code, p_display_name);
    end;
    $body$
  $ddl$;

  execute $ddl$
    create or replace function public.list_my_reservations(p_space_id uuid default null)
    returns jsonb
    language plpgsql
    security definer
    set search_path = ''
    as $body$
    declare
      payload jsonb;
      visible_plans jsonb;
    begin
      if p_space_id is not null and exists (
        select 1 from public.spaces where id = p_space_id and space_type = 'couple'
      ) then
        return jsonb_build_object('user_id', auth.uid(), 'plans', '[]'::jsonb);
      end if;
      payload := public.list_my_reservations_with_legacy_couple(p_space_id);
      select coalesce(jsonb_agg(item), '[]'::jsonb)
      into visible_plans
      from jsonb_array_elements(coalesce(payload -> 'plans', '[]'::jsonb)) item
      where item ->> 'space_type' <> 'couple';
      return jsonb_set(payload, '{plans}', visible_plans, true);
    end;
    $body$
  $ddl$;

  execute 'revoke all on function public.list_my_spaces(text) from public, anon';
  execute 'revoke all on function public.create_shared_space(text, text, text) from public, anon';
  execute 'revoke all on function public.refresh_space_invite(uuid) from public, anon';
  execute 'revoke all on function public.join_shared_space(text, text) from public, anon';
  execute 'revoke all on function public.list_my_reservations(uuid) from public, anon';
  execute 'grant execute on function public.list_my_spaces(text) to authenticated';
  execute 'grant execute on function public.create_shared_space(text, text, text) to authenticated';
  execute 'grant execute on function public.refresh_space_invite(uuid) to authenticated';
  execute 'grant execute on function public.join_shared_space(text, text) to authenticated';
  execute 'grant execute on function public.list_my_reservations(uuid) to authenticated';
end;
$generic$;
