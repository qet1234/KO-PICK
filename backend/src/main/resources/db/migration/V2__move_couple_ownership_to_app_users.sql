create table if not exists public.couples (
  id uuid primary key,
  created_by uuid not null references public.app_users(id) on delete cascade,
  invite_code_hash text,
  invite_expires_at timestamptz,
  invite_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  role text not null check (role in ('creator', 'partner')),
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id),
  unique (user_id)
);

create table if not exists public.couple_anniversaries (
  id uuid primary key,
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  anniversary_date date not null,
  repeats_yearly boolean not null default true,
  note text check (note is null or char_length(note) <= 500),
  created_by uuid not null references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.couple_calendar_events (
  id uuid primary key,
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text check (location is null or char_length(location) <= 160),
  note text check (note is null or char_length(note) <= 1000),
  color text not null default 'red' check (color in ('red', 'blue', 'lime', 'pink', 'black')),
  created_by uuid not null references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create unique index if not exists couples_invite_code_hash_idx
  on public.couples (invite_code_hash) where invite_code_hash is not null;
create index if not exists couple_members_couple_idx
  on public.couple_members (couple_id, joined_at);
create index if not exists couple_anniversaries_couple_date_idx
  on public.couple_anniversaries (couple_id, anniversary_date);
create index if not exists couple_calendar_events_couple_start_idx
  on public.couple_calendar_events (couple_id, starts_at);

do $$
begin
  if to_regclass('public.couples') is not null then
    alter table public.couples drop constraint if exists couples_created_by_fkey;
    alter table public.couples
      add constraint couples_created_by_fkey
      foreign key (created_by) references public.app_users(id) on delete cascade;
  end if;

  if to_regclass('public.couple_members') is not null then
    alter table public.couple_members drop constraint if exists couple_members_user_id_fkey;
    alter table public.couple_members
      add constraint couple_members_user_id_fkey
      foreign key (user_id) references public.app_users(id) on delete cascade;
  end if;

  if to_regclass('public.couple_anniversaries') is not null then
    alter table public.couple_anniversaries drop constraint if exists couple_anniversaries_created_by_fkey;
    alter table public.couple_anniversaries
      add constraint couple_anniversaries_created_by_fkey
      foreign key (created_by) references public.app_users(id) on delete cascade;
  end if;

  if to_regclass('public.couple_calendar_events') is not null then
    alter table public.couple_calendar_events drop constraint if exists couple_calendar_events_created_by_fkey;
    alter table public.couple_calendar_events
      add constraint couple_calendar_events_created_by_fkey
      foreign key (created_by) references public.app_users(id) on delete cascade;
  end if;
end $$;

alter table public.couples disable row level security;
alter table public.couple_members disable row level security;
alter table public.couple_anniversaries disable row level security;
alter table public.couple_calendar_events disable row level security;
