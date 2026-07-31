-- Legally safer login consent records and privacy-preserving public course links.
-- Raw share tokens are never stored; only SHA-256 hashes are persisted.

create table if not exists public.user_legal_consents (
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('terms', 'privacy')),
  document_version text not null check (char_length(document_version) between 8 and 32),
  source text not null check (char_length(source) between 1 and 40),
  accepted_at timestamptz not null default now(),
  primary key (user_id, document_type, document_version)
);

alter table public.user_legal_consents enable row level security;
revoke all on public.user_legal_consents from public, anon, authenticated;
grant all on public.user_legal_consents to service_role;

create or replace function public.record_user_legal_consents(
  p_terms_version text,
  p_privacy_version text,
  p_source text default 'social'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  safe_source text := lower(btrim(coalesce(p_source, 'social')));
begin
  if actor is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if p_terms_version !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
     or p_privacy_version !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$' then
    raise exception '동의 문서 버전이 올바르지 않습니다.';
  end if;

  if char_length(safe_source) not between 1 and 40 then
    safe_source := 'social';
  end if;

  insert into public.user_legal_consents(user_id, document_type, document_version, source)
  values
    (actor, 'terms', p_terms_version, safe_source),
    (actor, 'privacy', p_privacy_version, safe_source)
  on conflict (user_id, document_type, document_version)
  do nothing;
end;
$$;

revoke all on function public.record_user_legal_consents(text, text, text)
  from public, anon;
grant execute on function public.record_user_legal_consents(text, text, text)
  to authenticated;

create table if not exists public.shared_courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  region text not null check (char_length(region) between 1 and 40),
  duration text not null check (char_length(duration) between 1 and 20),
  course_snapshot jsonb not null check (
    jsonb_typeof(course_snapshot) = 'object'
    and octet_length(course_snapshot::text) <= 30000
  ),
  share_token_hash text not null unique check (share_token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at and expires_at <= created_at + interval '31 days')
);

create index if not exists shared_courses_owner_created_idx
  on public.shared_courses(owner_id, created_at desc);
create index if not exists shared_courses_expiry_idx
  on public.shared_courses(expires_at) where revoked_at is null;

alter table public.shared_courses enable row level security;
revoke all on public.shared_courses from public, anon, authenticated;
grant all on public.shared_courses to service_role;

create or replace function public.create_course_share(
  p_title text,
  p_region text,
  p_duration text,
  p_snapshot jsonb,
  p_share_token_hash text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  new_share public.shared_courses%rowtype;
  active_count integer;
begin
  if actor is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 80
     or char_length(btrim(coalesce(p_region, ''))) not between 1 and 40
     or char_length(btrim(coalesce(p_duration, ''))) not between 1 and 20 then
    raise exception '공유할 코스 정보가 올바르지 않습니다.';
  end if;

  if p_snapshot is null
     or jsonb_typeof(p_snapshot) <> 'object'
     or jsonb_typeof(p_snapshot -> 'places') <> 'array'
     or jsonb_array_length(p_snapshot -> 'places') not between 2 and 6
     or octet_length(p_snapshot::text) > 30000 then
    raise exception '공유할 장소는 2곳 이상 6곳 이하이어야 합니다.';
  end if;

  if p_share_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception '공유 토큰이 올바르지 않습니다.';
  end if;

  if p_expires_at < now() + interval '5 minutes'
     or p_expires_at > now() + interval '31 days' then
    raise exception '공유 만료일이 허용 범위를 벗어났습니다.';
  end if;

  select count(*) into active_count
  from public.shared_courses
  where owner_id = actor
    and revoked_at is null
    and expires_at > now();

  if active_count >= 20 then
    raise exception '활성 공유 링크는 최대 20개까지 만들 수 있습니다. 기존 링크를 취소해 주세요.';
  end if;

  delete from public.shared_courses
  where expires_at < now() - interval '7 days';

  insert into public.shared_courses(
    owner_id, title, region, duration, course_snapshot, share_token_hash, expires_at
  ) values (
    actor,
    btrim(p_title),
    btrim(p_region),
    btrim(p_duration),
    p_snapshot,
    p_share_token_hash,
    p_expires_at
  ) returning * into new_share;

  return jsonb_build_object(
    'id', new_share.id,
    'title', new_share.title,
    'region', new_share.region,
    'duration', new_share.duration,
    'expiresAt', new_share.expires_at,
    'createdAt', new_share.created_at
  );
end;
$$;

create or replace function public.get_shared_course(p_share_token_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  payload jsonb;
begin
  if p_share_token_hash !~ '^[0-9a-f]{64}$' then
    return null;
  end if;

  select jsonb_build_object(
    'title', title,
    'region', region,
    'duration', duration,
    'snapshot', course_snapshot,
    'expiresAt', expires_at,
    'createdAt', created_at
  ) into payload
  from public.shared_courses
  where share_token_hash = p_share_token_hash
    and revoked_at is null
    and expires_at > now();

  return payload;
end;
$$;

create or replace function public.list_my_course_shares()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null then '[]'::jsonb
    else coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'title', title,
      'region', region,
      'duration', duration,
      'expiresAt', expires_at,
      'createdAt', created_at,
      'revokedAt', revoked_at
    ) order by created_at desc), '[]'::jsonb)
  end
  from public.shared_courses
  where owner_id = auth.uid()
    and revoked_at is null
    and expires_at > now();
$$;

create or replace function public.revoke_course_share(p_share_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  update public.shared_courses
  set revoked_at = now()
  where id = p_share_id
    and owner_id = auth.uid()
    and revoked_at is null;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

revoke all on function public.create_course_share(text, text, text, jsonb, text, timestamptz)
  from public, anon;
revoke all on function public.get_shared_course(text) from public;
revoke all on function public.list_my_course_shares() from public, anon;
revoke all on function public.revoke_course_share(uuid) from public, anon;

grant execute on function public.create_course_share(text, text, text, jsonb, text, timestamptz)
  to authenticated;
grant execute on function public.get_shared_course(text) to anon, authenticated;
grant execute on function public.list_my_course_shares() to authenticated;
grant execute on function public.revoke_course_share(uuid) to authenticated;

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

  delete from public.shared_courses
  where expires_at < now() - interval '7 days';
end;
$$;

revoke all on function public.prune_service_activity_events()
  from public, anon, authenticated;
grant execute on function public.prune_service_activity_events()
  to service_role;
