create extension if not exists pg_cron;

create or replace function public.refresh_place_popularity()
returns void
language plpgsql
set search_path to 'public'
as $$
begin
  delete from public.place_popularity p
  where not exists (
    select 1
    from public.place_click_events e
    where e.provider = p.provider
      and e.external_id = p.external_id
      and e.created_at >= now() - interval '30 days'
  );

  insert into public.place_popularity(
    provider, external_id, views_1d, views_7d, views_30d,
    favorites_30d, routes_30d, shares_30d, score, calculated_at
  )
  select
    e.provider,
    e.external_id,
    count(*) filter (where e.event_type in ('view','detail') and e.created_at >= now() - interval '1 day'),
    count(*) filter (where e.event_type in ('view','detail') and e.created_at >= now() - interval '7 days'),
    count(*) filter (where e.event_type in ('view','detail') and e.created_at >= now() - interval '30 days'),
    count(*) filter (where e.event_type = 'favorite' and e.created_at >= now() - interval '30 days'),
    count(*) filter (where e.event_type = 'route' and e.created_at >= now() - interval '30 days'),
    count(*) filter (where e.event_type = 'share' and e.created_at >= now() - interval '30 days'),
    (count(*) filter (where e.event_type in ('view','detail') and e.created_at >= now() - interval '7 days'))::numeric
      + (count(*) filter (where e.event_type = 'map' and e.created_at >= now() - interval '30 days')) * 2
      + (count(*) filter (where e.event_type = 'route' and e.created_at >= now() - interval '30 days')) * 3
      + (count(*) filter (where e.event_type = 'favorite' and e.created_at >= now() - interval '30 days')) * 4
      + (count(*) filter (where e.event_type = 'share' and e.created_at >= now() - interval '30 days')) * 5
      + (count(*) filter (where e.event_type = 'reservation' and e.created_at >= now() - interval '30 days')) * 8,
    now()
  from public.place_click_events e
  where e.created_at >= now() - interval '30 days'
  group by e.provider, e.external_id
  on conflict (provider, external_id) do update set
    views_1d = excluded.views_1d,
    views_7d = excluded.views_7d,
    views_30d = excluded.views_30d,
    favorites_30d = excluded.favorites_30d,
    routes_30d = excluded.routes_30d,
    shares_30d = excluded.shares_30d,
    score = excluded.score,
    calculated_at = excluded.calculated_at;
end;
$$;

do $
begin
  if to_regclass('public.place_popularity') is not null
    and to_regclass('public.place_click_events') is not null then
    perform public.refresh_place_popularity();
  end if;
end
$;

select cron.schedule(
  'refresh-place-popularity',
  '*/10 * * * *',
  $$select public.refresh_place_popularity();$$
);