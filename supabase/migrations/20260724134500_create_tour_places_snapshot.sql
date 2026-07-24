create table if not exists public.tour_places (
  content_id text primary key,
  content_type_id text,
  name text not null,
  region text,
  city text,
  category text not null,
  detail_category text,
  area_code text,
  sigungu_code text,
  address text,
  latitude double precision,
  longitude double precision,
  image_url text,
  tel text,
  source_modified_at text,
  active boolean not null default true,
  sync_run_id uuid,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tour_places_active_category_region_idx
  on public.tour_places (active, category, region);
create index if not exists tour_places_region_city_idx
  on public.tour_places (region, city);
create index if not exists tour_places_area_sigungu_idx
  on public.tour_places (area_code, sigungu_code);
create index if not exists tour_places_content_type_idx
  on public.tour_places (content_type_id);
create index if not exists tour_places_name_idx
  on public.tour_places (name);

create table if not exists public.tour_place_sync_state (
  singleton boolean primary key default true check (singleton),
  run_id uuid,
  next_page integer not null default 1,
  page_size integer not null default 1000,
  total_pages integer not null default 1,
  total_count bigint not null default 0,
  imported_count bigint not null default 0,
  status text not null default 'idle',
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.tour_place_sync_state (singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.tour_places enable row level security;
alter table public.tour_place_sync_state enable row level security;

revoke all on public.tour_places from anon, authenticated;
revoke all on public.tour_place_sync_state from anon, authenticated;

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
  order by p.name, p.content_id
  offset greatest(coalesce(p_offset, 0), 0)
  limit greatest(1, least(coalesce(p_limit, 12), 100));
$$;

create or replace function public.tour_place_subregions(p_region text)
returns table (code text, name text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct
    coalesce(nullif(p.sigungu_code, ''), p.city) as code,
    p.city as name
  from public.tour_places p
  where p.active
    and p.region = p_region
    and p.city is not null
    and p.city <> ''
  order by name;
$$;

revoke all on function public.search_tour_places(text, text, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.tour_place_subregions(text) from public, anon, authenticated;
grant execute on function public.search_tour_places(text, text, text, text, integer, integer) to service_role;
grant execute on function public.tour_place_subregions(text) to service_role;
