create or replace function public.list_my_reservations(
  p_space_id uuid default null
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

  select jsonb_build_object(
    'user_id', actor,
    'plans', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'space_id', p.space_id,
          'space_name', s.name,
          'space_type', s.space_type,
          'title', p.title,
          'purpose', p.purpose,
          'reservation_date', to_char(p.reservation_date, 'YYYY-MM-DD'),
          'party_size', p.party_size,
          'budget_per_person', p.budget_per_person,
          'note', p.note,
          'status', p.status,
          'can_manage', p.created_by = actor,
          'candidates', coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'id', c.id,
                  'plan_id', c.plan_id,
                  'place_source', c.place_source,
                  'place_id', c.place_id,
                  'place_name', c.place_name,
                  'category', c.category,
                  'address', c.address,
                  'starts_at', c.starts_at,
                  'external_reservation_url', c.external_reservation_url,
                  'is_selected', c.is_selected,
                  'created_by', c.created_by,
                  'created_at', c.created_at,
                  'vote_count', (
                    select count(*)
                    from public.space_reservation_votes v
                    where v.candidate_id = c.id
                  ),
                  'voted_by_me', exists (
                    select 1
                    from public.space_reservation_votes v
                    where v.candidate_id = c.id
                      and v.user_id = actor
                  ),
                  'voters', coalesce(
                    (
                      select jsonb_agg(
                        jsonb_build_object('display_name', sm.display_name)
                        order by v.created_at
                      )
                      from public.space_reservation_votes v
                      join public.space_members sm
                        on sm.space_id = p.space_id
                       and sm.user_id = v.user_id
                      where v.candidate_id = c.id
                    ),
                    '[]'::jsonb
                  )
                )
                order by
                  c.is_selected desc,
                  (
                    select count(*)
                    from public.space_reservation_votes vote_order
                    where vote_order.candidate_id = c.id
                  ) desc,
                  c.created_at
              )
              from public.space_reservation_candidates c
              where c.plan_id = p.id
            ),
            '[]'::jsonb
          )
        )
        order by p.reservation_date desc, p.created_at desc
      ),
      '[]'::jsonb
    )
  )
  into payload
  from public.space_reservation_plans p
  join public.spaces s on s.id = p.space_id
  join public.space_members me
    on me.space_id = p.space_id
   and me.user_id = actor
  where p_space_id is null
     or p.space_id = p_space_id;

  return payload;
end;
$$;

create or replace function public.create_reservation_plan(
  p_space_id uuid,
  p_title text,
  p_purpose text,
  p_reservation_date date,
  p_party_size integer,
  p_budget_per_person integer default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  new_id uuid;
begin
  if actor is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if not private.is_space_member(p_space_id, actor) then
    raise exception '참여 중인 공간을 찾을 수 없습니다.';
  end if;

  if p_reservation_date < (now() at time zone 'Asia/Seoul')::date then
    raise exception '예약 날짜는 오늘 이후로 선택해 주세요.';
  end if;

  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 100 then
    raise exception '계획 이름을 확인해 주세요.';
  end if;

  if char_length(btrim(coalesce(p_purpose, ''))) not between 1 and 40 then
    raise exception '외출 목적을 확인해 주세요.';
  end if;

  if p_party_size not between 1 and 50 then
    raise exception '인원은 1명 이상 50명 이하로 선택해 주세요.';
  end if;

  if p_budget_per_person is not null
     and p_budget_per_person not between 0 and 10000000 then
    raise exception '예산을 확인해 주세요.';
  end if;

  insert into public.space_reservation_plans(
    space_id,
    title,
    purpose,
    reservation_date,
    party_size,
    budget_per_person,
    note,
    created_by
  )
  values (
    p_space_id,
    btrim(p_title),
    btrim(p_purpose),
    p_reservation_date,
    p_party_size,
    p_budget_per_person,
    nullif(btrim(p_note), ''),
    actor
  )
  returning id into new_id;

  return jsonb_build_object('plan_id', new_id, 'status', 'voting');
end;
$$;

create or replace function public.add_reservation_candidate(
  p_plan_id uuid,
  p_place_source text,
  p_place_id text,
  p_place_name text,
  p_category text,
  p_address text,
  p_starts_at timestamptz,
  p_external_reservation_url text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  plan_row public.space_reservation_plans%rowtype;
  new_id uuid;
  candidate_count integer;
begin
  if actor is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select p.*
  into plan_row
  from public.space_reservation_plans p
  where p.id = p_plan_id
    and private.is_space_member(p.space_id, actor);

  if plan_row.id is null then
    raise exception '접근할 수 있는 예약 계획을 찾지 못했습니다.';
  end if;

  if plan_row.status not in ('voting', 'ready') then
    raise exception '예약 요청 전 단계에서만 후보를 추가할 수 있습니다.';
  end if;

  if char_length(btrim(coalesce(p_place_name, ''))) not between 1 and 120 then
    raise exception '장소명을 확인해 주세요.';
  end if;

  if (p_starts_at at time zone 'Asia/Seoul')::date <> plan_row.reservation_date then
    raise exception '후보 방문 시간은 예약 계획 날짜와 같아야 합니다.';
  end if;

  if p_external_reservation_url is not null
     and p_external_reservation_url !~* '^https?://[^[:space:]]+$' then
    raise exception '외부 예약 링크는 올바른 http 또는 https 주소여야 합니다.';
  end if;

  select count(*)
  into candidate_count
  from public.space_reservation_candidates
  where plan_id = p_plan_id;

  if candidate_count >= 20 then
    raise exception '하나의 예약 계획에는 후보를 최대 20곳까지 추가할 수 있습니다.';
  end if;

  insert into public.space_reservation_candidates(
    plan_id,
    place_source,
    place_id,
    place_name,
    category,
    address,
    starts_at,
    external_reservation_url,
    created_by
  )
  values (
    p_plan_id,
    left(coalesce(nullif(btrim(p_place_source), ''), 'manual'), 30),
    nullif(btrim(p_place_id), ''),
    btrim(p_place_name),
    nullif(btrim(p_category), ''),
    nullif(btrim(p_address), ''),
    p_starts_at,
    nullif(btrim(p_external_reservation_url), ''),
    actor
  )
  returning id into new_id;

  return jsonb_build_object('candidate_id', new_id);
end;
$$;

create or replace function public.toggle_reservation_vote(
  p_candidate_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_space uuid;
  target_status text;
  removed integer;
begin
  if actor is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select p.space_id, p.status
  into target_space, target_status
  from public.space_reservation_candidates c
  join public.space_reservation_plans p on p.id = c.plan_id
  where c.id = p_candidate_id;

  if target_space is null
     or not private.is_space_member(target_space, actor) then
    raise exception '예약 후보를 찾을 수 없습니다.';
  end if;

  if target_status not in ('voting', 'ready') then
    raise exception '예약 요청 전 단계에서만 투표할 수 있습니다.';
  end if;

  delete from public.space_reservation_votes
  where candidate_id = p_candidate_id
    and user_id = actor;

  get diagnostics removed = row_count;

  if removed = 0 then
    insert into public.space_reservation_votes(candidate_id, user_id)
    values (p_candidate_id, actor)
    on conflict do nothing;
    return jsonb_build_object('voted', true);
  end if;

  return jsonb_build_object('voted', false);
end;
$$;

create or replace function public.finalize_reservation_plan(
  p_plan_id uuid,
  p_candidate_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  plan_row public.space_reservation_plans%rowtype;
  candidate_row public.space_reservation_candidates%rowtype;
begin
  if actor is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select *
  into plan_row
  from public.space_reservation_plans
  where id = p_plan_id
  for update;

  if plan_row.id is null or plan_row.created_by <> actor then
    raise exception '예약 계획을 만든 대표자만 최종 상태를 변경할 수 있습니다.';
  end if;

  if not private.is_space_member(plan_row.space_id, actor) then
    raise exception '접근할 수 있는 예약 계획을 찾지 못했습니다.';
  end if;

  if plan_row.status not in ('voting', 'ready') then
    raise exception '예약 요청 전 단계에서만 최종 장소를 변경할 수 있습니다.';
  end if;

  select *
  into candidate_row
  from public.space_reservation_candidates
  where id = p_candidate_id
    and plan_id = p_plan_id
  for update;

  if candidate_row.id is null then
    raise exception '선택할 예약 후보를 찾을 수 없습니다.';
  end if;

  update public.space_reservation_candidates
  set is_selected = false
  where plan_id = p_plan_id;

  update public.space_reservation_candidates
  set is_selected = true
  where id = p_candidate_id;

  update public.space_reservation_plans
  set status = 'ready',
      updated_at = now()
  where id = p_plan_id;

  insert into public.space_calendar_events(
    space_id,
    title,
    starts_at,
    all_day,
    location,
    note,
    color,
    created_by,
    reservation_plan_id
  )
  values (
    plan_row.space_id,
    '[함께 예약] ' || plan_row.title,
    candidate_row.starts_at,
    false,
    candidate_row.address,
    '선택 장소: ' || candidate_row.place_name,
    'blue',
    actor,
    p_plan_id
  )
  on conflict (reservation_plan_id)
    where reservation_plan_id is not null
  do update set
    title = excluded.title,
    starts_at = excluded.starts_at,
    location = excluded.location,
    note = excluded.note,
    updated_at = now();

  return jsonb_build_object(
    'status', 'ready',
    'candidate_id', p_candidate_id,
    'calendar_saved', true
  );
end;
$$;

create or replace function public.update_reservation_status(
  p_plan_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  plan_row public.space_reservation_plans%rowtype;
  normalized text := lower(btrim(coalesce(p_status, '')));
  has_selected boolean;
begin
  if actor is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if normalized not in ('requested', 'confirmed', 'cancelled') then
    raise exception '예약 요청 중, 예약 확정 또는 취소 상태만 선택할 수 있습니다.';
  end if;

  select *
  into plan_row
  from public.space_reservation_plans
  where id = p_plan_id
  for update;

  if plan_row.id is null or plan_row.created_by <> actor then
    raise exception '예약 계획을 만든 대표자만 최종 상태를 변경할 수 있습니다.';
  end if;

  select exists (
    select 1
    from public.space_reservation_candidates
    where plan_id = p_plan_id
      and is_selected
  )
  into has_selected;

  if normalized <> 'cancelled' and not has_selected then
    raise exception '먼저 투표 결과에서 최종 장소를 확정해 주세요.';
  end if;

  if not (
    (normalized = 'requested' and plan_row.status = 'ready')
    or (normalized = 'confirmed' and plan_row.status = 'requested')
    or (
      normalized = 'cancelled'
      and plan_row.status not in ('confirmed', 'cancelled')
    )
  ) then
    raise exception '현재 단계에서는 선택한 예약 상태로 변경할 수 없습니다.';
  end if;

  update public.space_reservation_plans
  set status = normalized,
      updated_at = now()
  where id = p_plan_id;

  return jsonb_build_object('status', normalized);
end;
$$;

create or replace function public.delete_reservation_plan(
  p_plan_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  changed integer;
begin
  if actor is null then
    raise exception '로그인이 필요합니다.';
  end if;

  delete from public.space_reservation_plans
  where id = p_plan_id
    and created_by = actor;

  get diagnostics changed = row_count;

  if changed = 0 then
    raise exception '예약 계획을 만든 대표자만 삭제할 수 있습니다.';
  end if;

  return true;
end;
$$;

revoke all on function public.list_my_reservations(uuid) from public, anon;
revoke all on function public.create_reservation_plan(uuid, text, text, date, integer, integer, text) from public, anon;
revoke all on function public.add_reservation_candidate(uuid, text, text, text, text, text, timestamptz, text) from public, anon;
revoke all on function public.toggle_reservation_vote(uuid) from public, anon;
revoke all on function public.finalize_reservation_plan(uuid, uuid) from public, anon;
revoke all on function public.update_reservation_status(uuid, text) from public, anon;
revoke all on function public.delete_reservation_plan(uuid) from public, anon;

grant execute on function public.list_my_reservations(uuid) to authenticated;
grant execute on function public.create_reservation_plan(uuid, text, text, date, integer, integer, text) to authenticated;
grant execute on function public.add_reservation_candidate(uuid, text, text, text, text, text, timestamptz, text) to authenticated;
grant execute on function public.toggle_reservation_vote(uuid) to authenticated;
grant execute on function public.finalize_reservation_plan(uuid, uuid) to authenticated;
grant execute on function public.update_reservation_status(uuid, text) to authenticated;
grant execute on function public.delete_reservation_plan(uuid) to authenticated;
