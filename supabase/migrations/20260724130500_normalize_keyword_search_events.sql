do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'keyword_search_events'
      and column_name = 'visitor_key'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'keyword_search_events'
      and column_name = 'visitor_id'
  ) then
    alter table public.keyword_search_events rename column visitor_key to visitor_id;
  end if;
end $$;

alter table public.keyword_search_events
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.keyword_search_events
  add column if not exists visitor_id text;

update public.keyword_search_events
set visitor_id = 'legacy-' || id::text
where visitor_id is null or btrim(visitor_id) = '';

alter table public.keyword_search_events
  alter column visitor_id set not null;

alter table public.keyword_search_events
  drop constraint if exists keyword_search_events_keyword_check;

alter table public.keyword_search_events
  add constraint keyword_search_events_keyword_check
  check (char_length(keyword) between 1 and 80);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'keyword_search_events'
      and column_name = 'event_bucket'
  ) then
    alter table public.keyword_search_events
      alter column event_bucket set default floor(extract(epoch from now()) / 1800)::bigint;
  end if;
end $$;

drop index if exists public.keyword_search_events_deduplicate_idx;

create index if not exists keyword_search_events_visitor_idx
  on public.keyword_search_events(visitor_id, created_at desc);
