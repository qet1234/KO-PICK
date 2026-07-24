alter table public.keyword_search_events enable row level security;

revoke all on public.keyword_search_events from anon, authenticated;
grant all on public.keyword_search_events to service_role;
grant usage, select on sequence public.keyword_search_events_id_seq to service_role;

create or replace function public.trending_places(
  p_limit integer default 8
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with recent as (
    select
      e.*,
      case e.event_type
        when 'favorite' then 5
        when 'outbound' then 3
        when 'detail' then 2
        else 1
      end as weight
    from public.place_activity_events e
    where e.created_at > now() - interval '7 days'
  ),
  ranked as (
    select
      source_id as id,
      max(name) as name,
      max(region) as region,
      max(city) as city,
      max(category) as category,
      max(address) as address,
      max(image_url) as image_url,
      sum(weight)::bigint as score,
      count(*)::bigint as activity_count,
      max(created_at) as last_activity_at
    from recent
    group by source_id
    order by
      sum(weight) desc,
      count(*) desc,
      max(created_at) desc
    limit greatest(1, least(coalesce(p_limit, 8), 30))
  )
  select coalesce(
    jsonb_agg(to_jsonb(ranked) - 'last_activity_at'),
    '[]'::jsonb
  )
  from ranked;
$$;

create or replace function public.trending_keywords(
  p_limit integer default 10
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select
      keyword,
      count(*)::bigint as search_count,
      max(created_at) as last_searched_at
    from public.keyword_search_events
    where created_at > now() - interval '7 days'
    group by keyword
    order by count(*) desc, max(created_at) desc
    limit greatest(1, least(coalesce(p_limit, 10), 30))
  )
  select coalesce(
    jsonb_agg(to_jsonb(ranked)),
    '[]'::jsonb
  )
  from ranked;
$$;

revoke all on function public.trending_places(integer) from public;
revoke all on function public.trending_keywords(integer) from public;

grant execute on function public.trending_places(integer)
  to anon, authenticated, service_role;
grant execute on function public.trending_keywords(integer)
  to anon, authenticated, service_role;
