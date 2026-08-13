begin;

create or replace function public.bridge_operation_event_to_place_analytics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider text;
  v_external_id text;
  v_event_type text;
  v_keyword text;
  v_region text;
  v_city text;
  v_category text;
  v_result_count integer;
begin
  if new.event_type in ('search_success', 'search_no_results') then
    v_keyword := left(coalesce(
      nullif(btrim(new.metadata ->> 'query'), ''),
      nullif(btrim(new.metadata ->> 'locality'), ''),
      nullif(btrim(new.metadata ->> 'foodDetail'), ''),
      nullif(btrim(new.metadata ->> 'foodType'), ''),
      nullif(btrim(new.metadata ->> 'category'), ''),
      nullif(btrim(new.route), ''),
      '전체'
    ), 160);
    v_region := nullif(btrim(coalesce(new.metadata ->> 'region', '')), '');
    v_city := nullif(btrim(coalesce(new.metadata ->> 'district', new.metadata ->> 'city', '')), '');
    v_category := nullif(btrim(coalesce(new.metadata ->> 'category', new.metadata ->> 'foodType', '')), '');
    begin
      v_result_count := nullif(new.metadata ->> 'resultCount', '')::integer;
    exception when others then
      v_result_count := case when new.event_type = 'search_success' then 1 else 0 end;
    end;

    insert into public.place_search_events(
      user_id, visitor_id, keyword, region, city, category, result_count, created_at
    ) values (
      null,
      new.visitor_id::text,
      v_keyword,
      v_region,
      v_city,
      v_category,
      greatest(coalesce(v_result_count, 0), 0),
      new.created_at
    );
  end if;

  if new.event_type in ('place_card_click', 'map_open', 'directions_open', 'booking_open')
     and new.place_id is not null
     and btrim(new.place_id) <> '' then
    v_external_id := left(btrim(new.place_id), 160);
    v_provider := lower(coalesce(
      nullif(btrim(new.metadata ->> 'provider'), ''),
      nullif(btrim(new.metadata ->> 'source'), ''),
      'tourapi'
    ));
    if v_provider in ('tour_api', 'tour api', 'kto') then v_provider := 'tourapi'; end if;
    if v_provider in ('naver', 'naver_local', 'naver-map', 'naver_map') then v_provider := 'naver'; end if;
    v_provider := left(v_provider, 30);

    v_event_type := case new.event_type
      when 'place_card_click' then 'view'
      when 'map_open' then 'map'
      when 'directions_open' then 'route'
      when 'booking_open' then 'reservation'
      else 'view'
    end;

    insert into public.place_click_events(
      user_id, visitor_id, provider, external_id, event_type, source_screen, created_at
    ) values (
      null,
      new.visitor_id::text,
      v_provider,
      v_external_id,
      v_event_type,
      left(coalesce(nullif(btrim(new.feature), ''), nullif(btrim(new.route), ''), 'unknown'), 120),
      new.created_at
    );
  end if;

  return new;
end;
$$;

revoke all on function public.bridge_operation_event_to_place_analytics()
  from public, anon, authenticated;
grant execute on function public.bridge_operation_event_to_place_analytics()
  to service_role;

drop trigger if exists bridge_operation_event_to_place_analytics_trigger
  on public.admin_operation_events;
create trigger bridge_operation_event_to_place_analytics_trigger
after insert on public.admin_operation_events
for each row
execute function public.bridge_operation_event_to_place_analytics();

create index if not exists place_search_events_created_idx
  on public.place_search_events(created_at desc);
create index if not exists place_click_events_provider_external_created_idx
  on public.place_click_events(provider, external_id, created_at desc);

commit;
