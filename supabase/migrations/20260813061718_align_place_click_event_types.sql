do $$
begin
  if to_regclass('public.place_click_events') is not null then
    alter table public.place_click_events
      drop constraint if exists place_click_events_event_type_check;

    alter table public.place_click_events
      add constraint place_click_events_event_type_check
      check (event_type in ('view','detail','outbound','favorite','route','share','map','reservation'));
  end if;
end
$$;
