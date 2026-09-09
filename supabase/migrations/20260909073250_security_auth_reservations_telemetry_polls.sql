-- Bound all enforcement to database identities; no caller-supplied voter/visitor identity.
-- New authenticated telemetry is also removed by account deletion, including the mobile API.
alter table public.admin_operation_events add column if not exists actor_user_id uuid references auth.users(id) on delete cascade;
create index if not exists admin_operation_events_actor_idx on public.admin_operation_events(actor_user_id) where actor_user_id is not null;
create table if not exists public.security_rate_limits (
  scope text not null, subject text not null, bucket bigint not null,
  hits integer not null, expires_at timestamptz not null,
  primary key (scope, subject)
);
create index if not exists security_rate_limits_expiry_idx on public.security_rate_limits(expires_at);
alter table public.security_rate_limits enable row level security;
revoke all on public.security_rate_limits from public, anon, authenticated;
grant all on public.security_rate_limits to service_role;

create or replace function public.consume_security_rate_limit(p_scope text, p_subject text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_bucket bigint; counter integer;
begin
  if p_scope is null or length(p_scope) not between 1 and 64 or p_subject is null or length(p_subject) not between 1 and 160
    or p_limit is null or p_limit not between 1 and 10000 or p_window_seconds is null or p_window_seconds not between 1 and 86400 then
    raise exception 'Invalid limit configuration';
  end if;
  current_bucket := floor(extract(epoch from now()) / p_window_seconds)::bigint;
  delete from public.security_rate_limits where (scope, subject) in
    (select scope, subject from public.security_rate_limits where expires_at < now() limit 100);
  insert into public.security_rate_limits as limits(scope, subject, bucket, hits, expires_at)
  values (p_scope, p_subject, current_bucket, 1, now() + interval '2 days')
  on conflict (scope, subject) do update set
    hits = case when limits.bucket = excluded.bucket then least(limits.hits + 1, p_limit + 1) else 1 end,
    bucket = excluded.bucket, expires_at = excluded.expires_at
  returning hits into counter;
  return counter <= p_limit;
end; $$;
revoke all on function public.consume_security_rate_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_security_rate_limit(text,text,integer,integer) to service_role;

drop policy if exists merchant_reservations_owner_select on public.merchant_reservations;
create policy merchant_reservations_owner_select on public.merchant_reservations for select to authenticated
using (exists (select 1 from public.merchant_stores store where store.id = store_id
  and store.owner_user_id = (select auth.uid()) and store.approval_status = 'approved'));

create table if not exists public.mobile_auth_exchanges (
  code_hash text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  challenge text not null check (challenge ~ '^[0-9a-f]{64}$'),
  token_hash text not null,
  expires_at timestamptz not null default now() + interval '5 minutes'
);
create index if not exists mobile_auth_exchanges_expiry_idx on public.mobile_auth_exchanges(expires_at);
alter table public.mobile_auth_exchanges enable row level security;
revoke all on public.mobile_auth_exchanges from public, anon, authenticated;
grant all on public.mobile_auth_exchanges to service_role;
create or replace function public.consume_mobile_auth_exchange(p_code_hash text, p_challenge text)
returns text language plpgsql security definer set search_path = '' as $$
declare result text;
begin
  delete from public.mobile_auth_exchanges where expires_at < now();
  delete from public.mobile_auth_exchanges where code_hash = p_code_hash and challenge = p_challenge
    and expires_at > now() returning token_hash into result;
  return result;
end; $$;
revoke all on function public.consume_mobile_auth_exchange(text,text) from public, anon, authenticated;
grant execute on function public.consume_mobile_auth_exchange(text,text) to service_role;
create or replace function public.create_merchant_reservation(
  p_place_source text,
  p_place_id text,
  p_reservation_date date,
  p_reservation_time time,
  p_party_size integer,
  p_guest_name text,
  p_customer_phone text,
  p_menu text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_store public.merchant_stores%rowtype;
  created_id uuid;
begin
  if actor is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then raise exception '로그인이 필요합니다.'; end if;
  if p_reservation_date < (now() at time zone 'Asia/Seoul')::date then
    raise exception '예약 날짜는 오늘 이후로 선택해 주세요.';
  end if;
  if p_party_size not between 1 and 30 then raise exception '인원은 1명 이상 30명 이하로 선택해 주세요.'; end if;
  if char_length(btrim(coalesce(p_guest_name, ''))) not between 1 and 60 then raise exception '예약자명을 확인해 주세요.'; end if;
  if char_length(btrim(coalesce(p_customer_phone, ''))) not between 8 and 30 then raise exception '연락처를 확인해 주세요.'; end if;

  select * into target_store
  from public.merchant_stores
  where place_source = upper(btrim(coalesce(p_place_source, '')))
    and place_id = left(btrim(coalesce(p_place_id, '')), 160)
    and approval_status = 'approved'
  limit 1;
  if target_store.id is null then raise exception '오늘어디 예약을 지원하지 않는 매장입니다.'; end if;

  -- Serialize requests per customer, including direct REST RPC calls.
  perform pg_advisory_xact_lock(hashtextextended('reservation:' || actor::text, 0));
  if not public.consume_security_rate_limit('reservation-10min', actor::text, 5, 600)
     or not public.consume_security_rate_limit('reservation-day', actor::text, 20, 86400) then
    raise exception '예약 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.merchant_reservations where customer_user_id = actor
    and store_id = target_store.id and reservation_date = p_reservation_date and reservation_time = p_reservation_time
    and status in ('pending', 'confirmed', 'seated', 'completed')) then
    raise exception '같은 매장과 시간에 이미 예약이 있습니다.';
  end if;

  insert into public.merchant_reservations(
    store_id, customer_user_id, guest_name, customer_phone,
    reservation_date, reservation_time, party_size, menu, note
  ) values (
    target_store.id, actor, btrim(p_guest_name), btrim(p_customer_phone),
    p_reservation_date, p_reservation_time, p_party_size,
    nullif(left(btrim(coalesce(p_menu, '')), 120), ''),
    nullif(left(btrim(coalesce(p_note, '')), 500), '')
  ) returning id into created_id;

  return jsonb_build_object('reservation_id', created_id, 'status', 'pending');
end;
$$;

create or replace function public.create_place_poll(p_title text, p_candidates jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $body$
declare
  current_user_id uuid := auth.uid();
  poll_id uuid;
  share_token text := encode(extensions.gen_random_bytes(16), 'hex');
  candidate jsonb;
  candidate_count integer;
  candidate_position integer := 0;
begin
  if current_user_id is null then
    raise exception '로그인 후 함께 고르기를 만들 수 있습니다.';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 80 then
    raise exception '투표 제목은 1~80자로 입력해 주세요.';
  end if;
  if jsonb_typeof(p_candidates) <> 'array' then
    raise exception '장소 후보 형식이 올바르지 않습니다.';
  end if;

  candidate_count := jsonb_array_length(p_candidates);
  if candidate_count not between 2 and 5 then
    raise exception '장소 후보는 2~5개를 선택해 주세요.';
  end if;

  insert into public.place_polls(owner_id, title, share_token_hash)
  values (current_user_id, btrim(p_title), encode(extensions.digest(share_token, 'sha256'), 'hex'))
  returning id into poll_id;

  for candidate in select value from jsonb_array_elements(p_candidates)
  loop
    candidate_position := candidate_position + 1;
    if char_length(btrim(coalesce(candidate ->> 'placeName', ''))) not between 1 and 160 then
      raise exception '장소 이름을 확인해 주세요.';
    end if;

    insert into public.place_poll_candidates(
      poll_id, position, place_source, place_id, place_name, category,
      address, latitude, longitude, image_url
    ) values (
      poll_id,
      candidate_position,
      left(coalesce(nullif(btrim(candidate ->> 'source'), ''), 'tourapi'), 30),
      left(coalesce(nullif(btrim(candidate ->> 'sourceId'), ''), gen_random_uuid()::text), 160),
      left(btrim(candidate ->> 'placeName'), 160),
      left(coalesce(nullif(btrim(candidate ->> 'category'), ''), '장소'), 40),
      nullif(left(btrim(coalesce(candidate ->> 'address', '')), 300), ''),
      case when (candidate ->> 'latitude') ~ '^-?[0-9]+(\.[0-9]+)?$' then (candidate ->> 'latitude')::double precision end,
      case when (candidate ->> 'longitude') ~ '^-?[0-9]+(\.[0-9]+)?$' then (candidate ->> 'longitude')::double precision end,
      nullif(left(btrim(coalesce(candidate ->> 'imageUrl', '')), 1200), '')
    );
  end loop;

  return jsonb_build_object('token', share_token, 'pollId', poll_id, 'candidateCount', candidate_count);
end;
$body$;

create or replace function public.get_shared_place_poll(p_token text, p_voter_token text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $body$
declare
  poll_row public.place_polls%rowtype;
  voter_key text;
  candidates jsonb;
begin
  if char_length(btrim(coalesce(p_token, ''))) <> 32 then
    return jsonb_build_object('error', '유효하지 않은 공유 링크입니다.');
  end if;

  select * into poll_row
  from public.place_polls
  where share_token_hash = encode(extensions.digest(lower(btrim(p_token)), 'sha256'), 'hex')
  limit 1;

  if poll_row.id is null then
    return jsonb_build_object('error', '투표를 찾을 수 없습니다.');
  end if;

  if auth.uid() is not null then
    voter_key := encode(extensions.digest(poll_row.id::text || ':user:' || auth.uid()::text, 'sha256'), 'hex');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'position', c.position,
    'placeName', c.place_name,
    'category', c.category,
    'address', c.address,
    'latitude', c.latitude,
    'longitude', c.longitude,
    'imageUrl', c.image_url,
    'voteCount', (select count(*) from public.place_poll_votes v where v.candidate_id = c.id),
    'votedByMe', voter_key is not null and exists (
      select 1 from public.place_poll_votes v where v.poll_id = poll_row.id and v.voter_hash = voter_key and v.candidate_id = c.id
    )
  ) order by c.position), '[]'::jsonb)
  into candidates
  from public.place_poll_candidates c
  where c.poll_id = poll_row.id;

  return jsonb_build_object(
    'id', poll_row.id,
    'title', poll_row.title,
    'status', case when poll_row.status = 'open' and poll_row.closes_at > now() then 'open' else 'closed' end,
    'createdAt', poll_row.created_at,
    'closesAt', poll_row.closes_at,
    'selectedCandidateId', poll_row.selected_candidate_id,
    'candidates', candidates
  );
end;
$body$;

create or replace function public.vote_shared_place_poll(
  p_token text,
  p_candidate_id uuid,
  p_voter_token text,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $body$
declare
  poll_row public.place_polls%rowtype;
  voter_key text;
  existing_candidate uuid;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception '로그인 후 투표할 수 있습니다.';
  end if;
  if not public.consume_security_rate_limit('poll-vote', auth.uid()::text, 30, 60) then
    raise exception '투표 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
  end if;
  if char_length(btrim(coalesce(p_display_name, ''))) not between 1 and 20 then
    raise exception '이름은 1~20자로 입력해 주세요.';
  end if;

  select * into poll_row
  from public.place_polls
  where share_token_hash = encode(extensions.digest(lower(btrim(p_token)), 'sha256'), 'hex')
  limit 1;

  if poll_row.id is null then raise exception '투표를 찾을 수 없습니다.'; end if;
  if poll_row.status <> 'open' or poll_row.closes_at <= now() then raise exception '마감된 투표입니다.'; end if;
  if not exists (select 1 from public.place_poll_candidates where id = p_candidate_id and poll_id = poll_row.id) then
    raise exception '이 투표의 장소 후보가 아닙니다.';
  end if;

  voter_key := encode(extensions.digest(poll_row.id::text || ':user:' || auth.uid()::text, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(voter_key, 0));
  select candidate_id into existing_candidate
  from public.place_poll_votes
  where poll_id = poll_row.id and voter_hash = voter_key;

  if existing_candidate = p_candidate_id then
    delete from public.place_poll_votes where poll_id = poll_row.id and voter_hash = voter_key;
    return jsonb_build_object('voted', false);
  end if;

  insert into public.place_poll_votes(poll_id, candidate_id, voter_hash, display_name)
  values (poll_row.id, p_candidate_id, voter_key, left(btrim(p_display_name), 20))
  on conflict (poll_id, voter_hash) do update
    set candidate_id = excluded.candidate_id,
        display_name = excluded.display_name,
        updated_at = now();

  return jsonb_build_object('voted', true);
end;
$body$;


revoke all on function public.vote_shared_place_poll(text,uuid,text,text) from public, anon;
grant execute on function public.vote_shared_place_poll(text,uuid,text,text) to authenticated;
revoke all on function public.get_shared_place_poll(text,text) from public;
grant execute on function public.get_shared_place_poll(text,text) to anon, authenticated;
revoke all on function public.create_place_poll(text,jsonb) from public, anon;
grant execute on function public.create_place_poll(text,jsonb) to authenticated;
