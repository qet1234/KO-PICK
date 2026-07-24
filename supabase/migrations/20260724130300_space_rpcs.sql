create or replace function public.ensure_personal_space(
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  result_id uuid;
  safe_name text;
begin
  if actor is null then
    raise exception '로그인이 필요합니다.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));

  select id
  into result_id
  from public.spaces
  where created_by = actor
    and space_type = 'personal'
  limit 1;

  if result_id is null then
    insert into public.spaces(space_type, name, created_by)
    values ('personal', '나의 공간', actor)
    returning id into result_id;
  end if;

  safe_name := left(coalesce(nullif(btrim(p_display_name), ''), '나'), 24);

  insert into public.space_members(space_id, user_id, display_name, role)
  values (result_id, actor, safe_name, 'owner')
  on conflict (space_id, user_id)
  do update set display_name = excluded.display_name;

  return result_id;
end;
$$;

create or replace function public.list_my_spaces(
  p_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  payload jsonb;
begin
  if actor is null then
    raise exception '로그인이 필요합니다.';
  end if;

  perform public.ensure_personal_space(p_display_name);

  select jsonb_build_object(
    'user_id', actor,
    'spaces', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'space_type', s.space_type,
          'name', s.name,
          'member_role', me.role,
          'member_count', (
            select count(*)
            from public.space_members x
            where x.space_id = s.id
          ),
          'invite_expires_at', s.invite_expires_at,
          'created_at', s.created_at,
          'legacy_couple', false
        )
        order by
          case s.space_type
            when 'personal' then 0
            when 'couple' then 1
            when 'friends' then 2
            else 3
          end,
          s.created_at desc
      ),
      '[]'::jsonb
    )
  )
  into payload
  from public.space_members me
  join public.spaces s on s.id = me.space_id
  where me.user_id = actor;

  return payload;
end;
$$;

create or replace function public.create_shared_space(
  p_type text,
  p_name text,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_type text := lower(btrim(coalesce(p_type, '')));
  code text;
  expires_at timestamptz := now() + interval '24 hours';
  new_space_id uuid;
begin
  if actor is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if normalized_type not in ('couple', 'friends', 'family') then
    raise exception '커플, 친구 또는 가족 공간을 선택해 주세요.';
  end if;

  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception '공간 이름은 1자 이상 80자 이하로 입력해 주세요.';
  end if;

  if char_length(btrim(coalesce(p_display_name, ''))) not between 1 and 24 then
    raise exception '닉네임은 1자 이상 24자 이하로 입력해 주세요.';
  end if;

  if normalized_type = 'couple' and exists (
    select 1
    from public.space_members me
    join public.spaces s on s.id = me.space_id
    where me.user_id = actor
      and s.space_type = 'couple'
  ) then
    raise exception '이미 참여 중인 커플 공간이 있습니다.';
  end if;

  code := upper(encode(gen_random_bytes(16), 'hex'));

  insert into public.spaces(
    space_type,
    name,
    created_by,
    invite_code_hash,
    invite_expires_at
  )
  values (
    normalized_type,
    btrim(p_name),
    actor,
    encode(digest(code, 'sha256'), 'hex'),
    expires_at
  )
  returning id into new_space_id;

  insert into public.space_members(space_id, user_id, display_name, role)
  values (new_space_id, actor, btrim(p_display_name), 'owner');

  return jsonb_build_object(
    'space_id', new_space_id,
    'invite_code', code,
    'invite_expires_at', expires_at
  );
end;
$$;

create or replace function public.refresh_space_invite(
  p_space_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_type text;
  code text;
  expires_at timestamptz := now() + interval '24 hours';
  member_count integer;
begin
  if actor is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select s.space_type
  into target_type
  from public.spaces s
  join public.space_members me on me.space_id = s.id
  where s.id = p_space_id
    and me.user_id = actor
    and me.role = 'owner'
  for update of s;

  if target_type is null then
    raise exception '초대 코드를 만들 권한이 없습니다.';
  end if;

  if target_type = 'personal' then
    raise exception '개인 공간에는 다른 사람을 초대할 수 없습니다.';
  end if;

  select count(*)
  into member_count
  from public.space_members
  where space_id = p_space_id;

  if (target_type = 'couple' and member_count >= 2)
     or (target_type <> 'couple' and member_count >= 20) then
    raise exception '이 공간의 참여 인원이 모두 찼습니다.';
  end if;

  code := upper(encode(gen_random_bytes(16), 'hex'));

  update public.spaces
  set invite_code_hash = encode(digest(code, 'sha256'), 'hex'),
      invite_expires_at = expires_at,
      invite_used_at = null,
      invite_revoked_at = null,
      updated_at = now()
  where id = p_space_id;

  return jsonb_build_object(
    'space_id', p_space_id,
    'invite_code', code,
    'invite_expires_at', expires_at
  );
end;
$$;

create or replace function public.join_shared_space(
  p_invite_code text,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  code text := upper(regexp_replace(coalesce(p_invite_code, ''), '\s+', '', 'g'));
  target public.spaces%rowtype;
  attempts integer;
  member_count integer;
begin
  if actor is null then
    raise exception '로그인이 필요합니다.';
  end if;

  delete from public.space_invite_attempts
  where attempted_at < now() - interval '30 days';

  select count(*)
  into attempts
  from public.space_invite_attempts
  where user_id = actor
    and attempted_at > now() - interval '15 minutes'
    and not succeeded;

  if attempts >= 10 then
    return jsonb_build_object(
      'error',
      '초대 코드 입력 횟수를 초과했습니다. 15분 후 다시 시도해 주세요.'
    );
  end if;

  if code !~ '^[0-9A-F]{32}$' then
    insert into public.space_invite_attempts(user_id, succeeded)
    values (actor, false);
    return jsonb_build_object(
      'error',
      '초대 코드는 영문 대문자와 숫자로 된 32자리입니다.'
    );
  end if;

  if char_length(btrim(coalesce(p_display_name, ''))) not between 1 and 24 then
    return jsonb_build_object(
      'error',
      '닉네임은 1자 이상 24자 이하로 입력해 주세요.'
    );
  end if;

  select *
  into target
  from public.spaces
  where invite_code_hash = encode(digest(code, 'sha256'), 'hex')
    and invite_used_at is null
    and invite_revoked_at is null
    and invite_expires_at > now()
  for update;

  if target.id is null then
    insert into public.space_invite_attempts(user_id, succeeded)
    values (actor, false);
    return jsonb_build_object(
      'error',
      '초대 코드가 올바르지 않거나 만료되었습니다.'
    );
  end if;

  if exists (
    select 1
    from public.space_members
    where space_id = target.id
      and user_id = actor
  ) then
    return jsonb_build_object('error', '이미 참여 중인 공간입니다.');
  end if;

  if target.space_type = 'couple' and exists (
    select 1
    from public.space_members me
    join public.spaces s on s.id = me.space_id
    where me.user_id = actor
      and s.space_type = 'couple'
  ) then
    return jsonb_build_object(
      'error',
      '이미 참여 중인 커플 공간이 있습니다.'
    );
  end if;

  select count(*)
  into member_count
  from public.space_members
  where space_id = target.id;

  if (target.space_type = 'couple' and member_count >= 2)
     or (target.space_type <> 'couple' and member_count >= 20) then
    return jsonb_build_object(
      'error',
      '이 공간의 참여 인원이 모두 찼습니다.'
    );
  end if;

  insert into public.space_members(space_id, user_id, display_name, role)
  values (target.id, actor, btrim(p_display_name), 'member');

  update public.spaces
  set invite_used_at = now(),
      invite_revoked_at = now(),
      invite_code_hash = null,
      invite_expires_at = null,
      updated_at = now()
  where id = target.id;

  insert into public.space_invite_attempts(user_id, succeeded)
  values (actor, true);

  return jsonb_build_object('space_id', target.id);
end;
$$;

create or replace function public.leave_shared_space(
  p_space_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_type text;
  target_role text;
begin
  if actor is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select s.space_type, me.role
  into target_type, target_role
  from public.spaces s
  join public.space_members me on me.space_id = s.id
  where s.id = p_space_id
    and me.user_id = actor
  for update of s;

  if target_type is null then
    raise exception '참여 중인 공간을 찾을 수 없습니다.';
  end if;

  if target_type = 'personal' then
    raise exception '기본 개인 공간은 삭제할 수 없습니다.';
  end if;

  if target_role = 'owner' then
    delete from public.spaces where id = p_space_id;
  else
    delete from public.space_members
    where space_id = p_space_id
      and user_id = actor;
  end if;

  return true;
end;
$$;

revoke all on function public.ensure_personal_space(text) from public, anon;
revoke all on function public.list_my_spaces(text) from public, anon;
revoke all on function public.create_shared_space(text, text, text) from public, anon;
revoke all on function public.refresh_space_invite(uuid) from public, anon;
revoke all on function public.join_shared_space(text, text) from public, anon;
revoke all on function public.leave_shared_space(uuid) from public, anon;

grant execute on function public.ensure_personal_space(text) to authenticated;
grant execute on function public.list_my_spaces(text) to authenticated;
grant execute on function public.create_shared_space(text, text, text) to authenticated;
grant execute on function public.refresh_space_invite(uuid) to authenticated;
grant execute on function public.join_shared_space(text, text) to authenticated;
grant execute on function public.leave_shared_space(uuid) to authenticated;
