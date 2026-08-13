begin;

create or replace function public.get_place_popularity_scores(
  p_provider text,
  p_external_ids text[]
)
returns table (
  external_id text,
  score numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.external_id, p.score
  from public.place_popularity p
  where p.provider = lower(coalesce(p_provider, ''))
    and p.external_id = any(coalesce(p_external_ids, '{}'::text[]))
  order by p.score desc, p.external_id;
$$;

revoke all on function public.get_place_popularity_scores(text, text[])
  from public, anon, authenticated;
grant execute on function public.get_place_popularity_scores(text, text[])
  to service_role;

create or replace function public.search_tour_places(
  p_region text default '전국',
  p_category text default '전체',
  p_sigungu_code text default '',
  p_detail text default '전체',
  p_offset integer default 0,
  p_limit integer default 12
)
returns table (
  content_id text,
  content_type_id text,
  name text,
  region text,
  city text,
  category text,
  detail_category text,
  area_code text,
  sigungu_code text,
  address text,
  latitude double precision,
  longitude double precision,
  image_url text,
  tel text,
  source_modified_at text,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.content_id,
    p.content_type_id,
    p.name,
    p.region,
    p.city,
    p.category,
    p.detail_category,
    p.area_code,
    p.sigungu_code,
    p.address,
    p.latitude,
    p.longitude,
    p.image_url,
    p.tel,
    p.source_modified_at,
    count(*) over() as total_count
  from public.tour_places p
  left join public.place_popularity pop
    on pop.provider = 'tourapi' and pop.external_id = p.content_id
  where p.active
    and (coalesce(p_region, '전국') = '전국' or p.region = p_region)
    and (coalesce(p_category, '전체') = '전체' or p.category = p_category)
    and (
      coalesce(p_sigungu_code, '') = ''
      or p.sigungu_code = p_sigungu_code
      or p.city = p_sigungu_code
    )
    and (
      coalesce(p_detail, '전체') = '전체'
      or p.detail_category = p_detail
      or p.name ilike '%' || p_detail || '%'
      or coalesce(p.address, '') ilike '%' || p_detail || '%'
    )
  order by coalesce(pop.score, 0) desc, p.name, p.content_id
  offset greatest(coalesce(p_offset, 0), 0)
  limit greatest(1, least(coalesce(p_limit, 12), 100));
$$;

revoke all on function public.search_tour_places(text, text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.search_tour_places(text, text, text, text, integer, integer)
  to service_role;

commit;
