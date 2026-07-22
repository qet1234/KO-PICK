create table if not exists public.spaces (
    id uuid primary key,
    space_type varchar(20) not null check (space_type in ('personal', 'couple', 'friends', 'family')),
    name varchar(80) not null check (char_length(name) between 1 and 80),
    created_by uuid not null references public.app_users(id) on delete cascade,
    invite_code_hash varchar(64),
    invite_expires_at timestamptz,
    invite_used_at timestamptz,
    invite_revoked_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists spaces_personal_owner_idx
    on public.spaces(created_by)
    where space_type = 'personal';
create unique index if not exists spaces_invite_code_hash_idx
    on public.spaces(invite_code_hash)
    where invite_code_hash is not null;

create table if not exists public.space_members (
    space_id uuid not null references public.spaces(id) on delete cascade,
    user_id uuid not null references public.app_users(id) on delete cascade,
    display_name varchar(24) not null check (char_length(display_name) between 1 and 24),
    role varchar(20) not null check (role in ('owner', 'member')),
    joined_at timestamptz not null default now(),
    primary key (space_id, user_id)
);

create index if not exists space_members_user_idx
    on public.space_members(user_id, joined_at desc);
create index if not exists space_members_space_idx
    on public.space_members(space_id, joined_at);

create table if not exists public.space_calendar_events (
    id uuid primary key,
    space_id uuid not null references public.spaces(id) on delete cascade,
    title varchar(100) not null check (char_length(title) between 1 and 100),
    starts_at timestamptz not null,
    ends_at timestamptz,
    all_day boolean not null default false,
    location varchar(160),
    note varchar(1000),
    color varchar(20) not null default 'red'
        check (color in ('red', 'blue', 'lime', 'pink', 'black')),
    created_by uuid not null references public.app_users(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (ends_at is null or ends_at >= starts_at)
);

create index if not exists space_calendar_events_space_start_idx
    on public.space_calendar_events(space_id, starts_at);

create table if not exists public.space_milestones (
    id uuid primary key,
    space_id uuid not null references public.spaces(id) on delete cascade,
    title varchar(80) not null check (char_length(title) between 1 and 80),
    milestone_date date not null,
    repeats_yearly boolean not null default false,
    note varchar(500),
    created_by uuid not null references public.app_users(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists space_milestones_space_date_idx
    on public.space_milestones(space_id, milestone_date);

create table if not exists public.space_invite_attempts (
    user_id uuid not null references public.app_users(id) on delete cascade,
    attempted_at timestamptz not null default now(),
    succeeded boolean not null default false
);

create index if not exists space_invite_attempts_user_time_idx
    on public.space_invite_attempts(user_id, attempted_at desc);

-- 기존 커플 공간은 같은 UUID로 공통 공간에도 복사해 데이터와 링크를 보존한다.
insert into public.spaces (
    id, space_type, name, created_by, invite_code_hash, invite_expires_at,
    invite_used_at, invite_revoked_at, created_at, updated_at
)
select c.id, 'couple', '우리 둘의 공간', c.created_by, c.invite_code_hash,
       c.invite_expires_at, c.invite_used_at, c.invite_revoked_at,
       c.created_at, c.updated_at
  from public.couples c
on conflict (id) do nothing;

insert into public.space_members (space_id, user_id, display_name, role, joined_at)
select cm.couple_id, cm.user_id, cm.display_name,
       case when cm.role = 'creator' then 'owner' else 'member' end,
       cm.joined_at
  from public.couple_members cm
on conflict (space_id, user_id) do nothing;

insert into public.space_calendar_events (
    id, space_id, title, starts_at, ends_at, all_day, location, note, color,
    created_by, created_at, updated_at
)
select e.id, e.couple_id, e.title, e.starts_at, e.ends_at, e.all_day,
       e.location, e.note, e.color, e.created_by, e.created_at, e.updated_at
  from public.couple_calendar_events e
on conflict (id) do nothing;

insert into public.space_milestones (
    id, space_id, title, milestone_date, repeats_yearly, note,
    created_by, created_at, updated_at
)
select a.id, a.couple_id, a.title, a.anniversary_date, a.repeats_yearly,
       a.note, a.created_by, a.created_at, a.updated_at
  from public.couple_anniversaries a
on conflict (id) do nothing;
