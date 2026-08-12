begin;

-- 검색 성공까지 운영 이벤트로 수집해 검색 성공률과 인기 검색 조건을 계산합니다.
alter table public.admin_operation_events
  drop constraint if exists admin_operation_events_event_type_check;
alter table public.admin_operation_events
  add constraint admin_operation_events_event_type_check
  check (event_type in (
    'search_success', 'search_no_results', 'place_card_click', 'map_open', 'directions_open',
    'booking_open', 'app_error', 'app_crash', 'api_request'
  ));

create index if not exists admin_operation_events_place_engagement_idx
  on public.admin_operation_events(place_id, created_at desc)
  where place_id is not null
    and event_type in ('place_card_click', 'map_open', 'directions_open', 'booking_open');

create index if not exists admin_operation_events_search_created_idx
  on public.admin_operation_events(event_type, created_at desc)
  where event_type in ('search_success', 'search_no_results');

-- 장소 클릭보다 지도/길찾기/예약처럼 의도가 강한 행동에 더 높은 가중치를 주고,
-- 최근 행동일수록 더 크게 반영합니다. 데이터가 없으면 호출 측에서 기존 순서를 유지합니다.
create or replace function public.get_place_engagement_scores(
  p_place_ids text[] default null,
  p_days integer default 30
)
returns table (
  place_id text,
  score numeric,
  clicks bigint,
  map_opens bigint,
  directions bigint,
  bookings bigint,
  last_activity timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_days integer := least(greatest(coalesce(p_days, 30), 1), 90);
begin
  return query
  select
    events.place_id,
    round(sum(
      (case events.event_type
        when 'place_card_click' then 1.0
        when 'map_open' then 2.0
        when 'directions_open' then 3.0
        when 'booking_open' then 5.0
        else 0.0
      end)
      *
      (case
        when events.created_at >= now() - interval '1 day' then 2.0
        when events.created_at >= now() - interval '7 days' then 1.5
        else 1.0
      end)
    )::numeric, 2) as score,
    count(*) filter (where events.event_type = 'place_card_click') as clicks,
    count(*) filter (where events.event_type = 'map_open') as map_opens,
    count(*) filter (where events.event_type = 'directions_open') as directions,
    count(*) filter (where events.event_type = 'booking_open') as bookings,
    max(events.created_at) as last_activity
  from public.admin_operation_events events
  where events.created_at >= now() - make_interval(days => safe_days)
    and events.place_id is not null
    and events.event_type in ('place_card_click', 'map_open', 'directions_open', 'booking_open')
    and (
      p_place_ids is null
      or cardinality(p_place_ids) = 0
      or events.place_id = any(p_place_ids)
    )
  group by events.place_id
  order by score desc, last_activity desc
  limit 500;
end;
$$;

revoke all on function public.get_place_engagement_scores(text[], integer)
  from public, anon, authenticated;
grant execute on function public.get_place_engagement_scores(text[], integer)
  to service_role;

-- 기존 운영 대시보드 응답을 유지하면서 검색 성공률과 인기 장소/검색 조건을 추가합니다.
create or replace function public.get_admin_operations_dashboard(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_days integer := least(greatest(coalesce(p_days, 30), 1), 90);
  since_time timestamptz := now() - make_interval(days => safe_days);
  click_count bigint;
  search_count bigint;
  search_success_count bigint;
  result jsonb;
begin
  select count(*) into click_count
  from public.admin_operation_events
  where created_at >= since_time and event_type = 'place_card_click';

  select
    count(*) filter (where event_type in ('search_success', 'search_no_results')),
    count(*) filter (where event_type = 'search_success')
  into search_count, search_success_count
  from public.admin_operation_events
  where created_at >= since_time;

  select jsonb_build_object(
    'searches', search_count,
    'searchSuccesses', search_success_count,
    'searchSuccessRate', case
      when search_count = 0 then 0
      else round(search_success_count::numeric * 100 / search_count, 1)
    end,
    'searchNoResults', count(*) filter (where event_type = 'search_no_results'),
    'placeClicks', click_count,
    'appErrors', count(*) filter (where event_type = 'app_error'),
    'appCrashes', count(*) filter (where event_type = 'app_crash'),
    'slowApiCount', count(*) filter (where event_type = 'api_request' and duration_ms >= 1500),
    'apiErrorCount', count(*) filter (where event_type = 'api_request' and not success),
    'conversions', jsonb_build_object(
      'map', jsonb_build_object(
        'count', count(*) filter (where event_type = 'map_open'),
        'rate', case when click_count = 0 then 0 else round((count(*) filter (where event_type = 'map_open'))::numeric * 100 / click_count, 1) end
      ),
      'directions', jsonb_build_object(
        'count', count(*) filter (where event_type = 'directions_open'),
        'rate', case when click_count = 0 then 0 else round((count(*) filter (where event_type = 'directions_open'))::numeric * 100 / click_count, 1) end
      ),
      'booking', jsonb_build_object(
        'count', count(*) filter (where event_type = 'booking_open'),
        'rate', case when click_count = 0 then 0 else round((count(*) filter (where event_type = 'booking_open'))::numeric * 100 / click_count, 1) end
      )
    ),
    'topPlaces', coalesce((
      select jsonb_agg(to_jsonb(items) order by items.score desc)
      from (
        select
          place_id,
          max(place_name) filter (where place_name is not null) as place_name,
          max(category) filter (where category is not null) as category,
          count(*) filter (where event_type = 'place_card_click') as clicks,
          count(*) filter (where event_type = 'map_open') as map_opens,
          count(*) filter (where event_type = 'directions_open') as directions,
          count(*) filter (where event_type = 'booking_open') as bookings,
          round(sum(
            (case event_type
              when 'place_card_click' then 1.0
              when 'map_open' then 2.0
              when 'directions_open' then 3.0
              when 'booking_open' then 5.0
              else 0.0
            end)
            *
            (case
              when created_at >= now() - interval '1 day' then 2.0
              when created_at >= now() - interval '7 days' then 1.5
              else 1.0
            end)
          )::numeric, 1) as score
        from public.admin_operation_events
        where created_at >= since_time
          and place_id is not null
          and event_type in ('place_card_click', 'map_open', 'directions_open', 'booking_open')
        group by place_id
        order by score desc
        limit 10
      ) items
    ), '[]'::jsonb),
    'topSearches', coalesce((
      select jsonb_agg(to_jsonb(items) order by items.count desc)
      from (
        select
          coalesce(
            nullif(metadata->>'query', ''),
            nullif(metadata->>'locality', ''),
            nullif(metadata->>'category', ''),
            route,
            '-'
          ) as query,
          max(metadata->>'region') as region,
          max(metadata->>'category') as category,
          count(*) as count
        from public.admin_operation_events
        where created_at >= since_time and event_type = 'search_success'
        group by coalesce(
          nullif(metadata->>'query', ''),
          nullif(metadata->>'locality', ''),
          nullif(metadata->>'category', ''),
          route,
          '-'
        )
        order by count(*) desc
        limit 10
      ) items
    ), '[]'::jsonb),
    'slowApis', coalesce((
      select jsonb_agg(to_jsonb(items) order by items.p95_ms desc)
      from (
        select
          coalesce(route, feature) as route,
          count(*) as requests,
          round(avg(duration_ms))::integer as avg_ms,
          round(percentile_cont(0.95) within group (order by duration_ms))::integer as p95_ms,
          count(*) filter (where not success) as errors
        from public.admin_operation_events
        where created_at >= since_time and event_type = 'api_request' and duration_ms is not null
        group by coalesce(route, feature)
        order by percentile_cont(0.95) within group (order by duration_ms) desc
        limit 10
      ) items
    ), '[]'::jsonb),
    'noResultQueries', coalesce((
      select jsonb_agg(to_jsonb(items) order by items.count desc)
      from (
        select feature, coalesce(route, '-') as route, count(*) as count
        from public.admin_operation_events
        where created_at >= since_time and event_type = 'search_no_results'
        group by feature, coalesce(route, '-')
        order by count(*) desc
        limit 10
      ) items
    ), '[]'::jsonb),
    'recentErrors', coalesce((
      select jsonb_agg(to_jsonb(items) order by items.created_at desc)
      from (
        select platform, feature, route, error_message, status_code, created_at
        from public.admin_operation_events
        where created_at >= since_time and event_type in ('app_error', 'app_crash')
        order by created_at desc
        limit 20
      ) items
    ), '[]'::jsonb)
  ) into result
  from public.admin_operation_events
  where created_at >= since_time;

  return result;
end;
$$;

revoke all on function public.get_admin_operations_dashboard(integer)
  from public, anon, authenticated;
grant execute on function public.get_admin_operations_dashboard(integer)
  to service_role;

commit;
