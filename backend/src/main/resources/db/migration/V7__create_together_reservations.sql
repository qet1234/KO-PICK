create table if not exists public.space_reservation_plans (
    id uuid primary key,
    space_id uuid not null references public.spaces(id) on delete cascade,
    title varchar(100) not null check (char_length(title) between 1 and 100),
    purpose varchar(40) not null check (char_length(purpose) between 1 and 40),
    reservation_date date not null,
    party_size integer not null check (party_size between 1 and 50),
    budget_per_person integer check (budget_per_person is null or budget_per_person between 0 and 10000000),
    note varchar(1000),
    status varchar(20) not null default 'voting'
        check (status in ('voting', 'ready', 'requested', 'confirmed', 'cancelled')),
    created_by uuid not null references public.app_users(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists space_reservation_plans_space_date_idx
    on public.space_reservation_plans(space_id, reservation_date desc, created_at desc);

create table if not exists public.space_reservation_candidates (
    id uuid primary key,
    plan_id uuid not null references public.space_reservation_plans(id) on delete cascade,
    place_source varchar(30) not null default 'manual',
    place_id varchar(160),
    place_name varchar(120) not null check (char_length(place_name) between 1 and 120),
    category varchar(40),
    address varchar(240),
    starts_at timestamptz not null,
    external_reservation_url varchar(1000),
    is_selected boolean not null default false,
    created_by uuid not null references public.app_users(id) on delete cascade,
    created_at timestamptz not null default now()
);

create index if not exists space_reservation_candidates_plan_idx
    on public.space_reservation_candidates(plan_id, created_at);
create unique index if not exists space_reservation_one_selected_candidate_idx
    on public.space_reservation_candidates(plan_id)
    where is_selected;

create table if not exists public.space_reservation_votes (
    candidate_id uuid not null references public.space_reservation_candidates(id) on delete cascade,
    user_id uuid not null references public.app_users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (candidate_id, user_id)
);

create index if not exists space_reservation_votes_user_idx
    on public.space_reservation_votes(user_id, created_at desc);

alter table public.space_calendar_events
    add column if not exists reservation_plan_id uuid
        references public.space_reservation_plans(id) on delete cascade;

create unique index if not exists space_calendar_events_reservation_plan_idx
    on public.space_calendar_events(reservation_plan_id)
    where reservation_plan_id is not null;
