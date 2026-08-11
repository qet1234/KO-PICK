create extension if not exists pgcrypto;

create table if not exists public.user_saved_places (
  user_id uuid not null references auth.users(id) on delete cascade,
  place_source text not null check (char_length(place_source) between 1 and 30),
  place_id text not null check (char_length(place_id) between 1 and 160),
  place_name text not null check (char_length(place_name) between 1 and 160),
  category text not null check (char_length(category) between 1 and 40),
  region text check (region is null or char_length(region) <= 40),
  city text check (city is null or char_length(city) <= 80),
  address text check (address is null or char_length(address) <= 300),
  latitude double precision,
  longitude double precision,
  image_url text check (image_url is null or char_length(image_url) <= 1200),
  saved_at timestamptz not null default now(),
  primary key (user_id, place_source, place_id)
);

create index if not exists user_saved_places_recent_idx
  on public.user_saved_places(user_id, saved_at desc);

create table if not exists public.user_recent_places (
  user_id uuid not null references auth.users(id) on delete cascade,
  place_source text not null check (char_length(place_source) between 1 and 30),
  place_id text not null check (char_length(place_id) between 1 and 160),
  place_name text not null check (char_length(place_name) between 1 and 160),
  category text not null check (char_length(category) between 1 and 40),
  region text check (region is null or char_length(region) <= 40),
  city text check (city is null or char_length(city) <= 80),
  address text check (address is null or char_length(address) <= 300),
  latitude double precision,
  longitude double precision,
  image_url text check (image_url is null or char_length(image_url) <= 1200),
  viewed_at timestamptz not null default now(),
  view_count integer not null default 1 check (view_count > 0),
  primary key (user_id, place_source, place_id)
);

create index if not exists user_recent_places_recent_idx
  on public.user_recent_places(user_id, viewed_at desc);

alter table public.user_saved_places enable row level security;
alter table public.user_recent_places enable row level security;

drop policy if exists user_saved_places_owner_all on public.user_saved_places;
create policy user_saved_places_owner_all on public.user_saved_places
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists user_recent_places_owner_all on public.user_recent_places;
create policy user_recent_places_owner_all on public.user_recent_places
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.user_saved_places to authenticated;
grant select, insert, update, delete on public.user_recent_places to authenticated;

create table if not exists public.place_polls (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  share_token_hash text not null unique check (char_length(share_token_hash) = 64),
  status text not null default 'open' check (status in ('open', 'closed')),
  selected_candidate_id uuid,
  created_at timestamptz not null default now(),
  closes_at timestamptz not null default (now() + interval '14 days'),
  closed_at timestamptz
);

create table if not exists public.place_poll_candidates (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.place_polls(id) on delete cascade,
  position smallint not null check (position between 1 and 5),
  place_source text not null check (char_length(place_source) between 1 and 30),
  place_id text not null check (char_length(place_id) between 1 and 160),
  place_name text not null check (char_length(place_name) between 1 and 160),
  category text not null check (char_length(category) between 1 and 40),
  address text check (address is null or char_length(address) <= 300),
  latitude double precision,
  longitude double precision,
  image_url text check (image_url is null or char_length(image_url) <= 1200),
  created_at timestamptz not null default now(),
  unique (poll_id, position),
  unique (poll_id, place_source, place_id)
);

alter table public.place_polls
  drop constraint if exists place_polls_selected_candidate_id_fkey;
alter table public.place_polls
  add constraint place_polls_selected_candidate_id_fkey
  foreign key (selected_candidate_id) references public.place_poll_candidates(id) on delete set null;

create table if not exists public.place_poll_votes (
  poll_id uuid not null references public.place_polls(id) on delete cascade,
  candidate_id uuid not null references public.place_poll_candidates(id) on delete cascade,
  voter_hash text not null check (char_length(voter_hash) = 64),
  display_name text not null check (char_length(display_name) between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (poll_id, voter_hash)
);

create index if not exists place_poll_candidates_poll_idx
  on public.place_poll_candidates(poll_id, position);
create index if not exists place_poll_votes_candidate_idx
  on public.place_poll_votes(candidate_id, updated_at desc);
create index if not exists place_polls_owner_idx
  on public.place_polls(owner_id, created_at desc);

alter table public.place_polls enable row level security;
alter table public.place_poll_candidates enable row level security;
alter table public.place_poll_votes enable row level security;

drop policy if exists place_polls_owner_select on public.place_polls;
create policy place_polls_owner_select on public.place_polls
  for select to authenticated
  using (owner_id = (select auth.uid()));

revoke all on public.place_polls, public.place_poll_candidates, public.place_poll_votes from public, anon, authenticated;

create or replace function public.create_place_poll(p_title text, p_candidates jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $body$
declare
  current_user_id uuid := auth.uid();
  poll_id uuid;
  share_token text := encode(gen_random_bytes(16), 'hex');
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
  values (current_user_id, btrim(p_title), encode(digest(share_token, 'sha256'), 'hex'))
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
  where share_token_hash = encode(digest(lower(btrim(p_token)), 'sha256'), 'hex')
  limit 1;

  if poll_row.id is null then
    return jsonb_build_object('error', '투표를 찾을 수 없습니다.');
  end if;

  if p_voter_token is not null and char_length(p_voter_token) between 16 and 200 then
    voter_key := encode(digest(poll_row.id::text || ':' || p_voter_token, 'sha256'), 'hex');
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
  if char_length(btrim(coalesce(p_voter_token, ''))) not between 16 and 200 then
    raise exception '투표자 식별 정보가 올바르지 않습니다.';
  end if;
  if char_length(btrim(coalesce(p_display_name, ''))) not between 1 and 20 then
    raise exception '이름은 1~20자로 입력해 주세요.';
  end if;

  select * into poll_row
  from public.place_polls
  where share_token_hash = encode(digest(lower(btrim(p_token)), 'sha256'), 'hex')
  limit 1;

  if poll_row.id is null then raise exception '투표를 찾을 수 없습니다.'; end if;
  if poll_row.status <> 'open' or poll_row.closes_at <= now() then raise exception '마감된 투표입니다.'; end if;
  if not exists (select 1 from public.place_poll_candidates where id = p_candidate_id and poll_id = poll_row.id) then
    raise exception '이 투표의 장소 후보가 아닙니다.';
  end if;

  voter_key := encode(digest(poll_row.id::text || ':' || p_voter_token, 'sha256'), 'hex');
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

create or replace function public.close_place_poll(p_poll_id uuid, p_candidate_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $body$
begin
  if not exists (select 1 from public.place_polls where id = p_poll_id and owner_id = auth.uid()) then
    raise exception '투표를 마감할 권한이 없습니다.';
  end if;
  if p_candidate_id is not null and not exists (
    select 1 from public.place_poll_candidates where id = p_candidate_id and poll_id = p_poll_id
  ) then
    raise exception '이 투표의 장소 후보가 아닙니다.';
  end if;

  update public.place_polls
  set status = 'closed', selected_candidate_id = p_candidate_id, closed_at = now()
  where id = p_poll_id;
  return jsonb_build_object('closed', true);
end;
$body$;

revoke all on function public.create_place_poll(text, jsonb) from public, anon;
revoke all on function public.get_shared_place_poll(text, text) from public;
revoke all on function public.vote_shared_place_poll(text, uuid, text, text) from public;
revoke all on function public.close_place_poll(uuid, uuid) from public, anon;
grant execute on function public.create_place_poll(text, jsonb) to authenticated;
grant execute on function public.get_shared_place_poll(text, text) to anon, authenticated;
grant execute on function public.vote_shared_place_poll(text, uuid, text, text) to anon, authenticated;
grant execute on function public.close_place_poll(uuid, uuid) to authenticated;
