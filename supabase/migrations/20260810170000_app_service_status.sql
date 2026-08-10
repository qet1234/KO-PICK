create table if not exists public.app_service_status (
  id smallint primary key default 1 check (id = 1),
  mode text not null default 'operational'
    check (mode in ('operational', 'partial', 'maintenance')),
  title text not null default '서비스 점검 안내'
    check (char_length(title) between 1 and 80),
  message text not null default '더 안정적인 서비스 제공을 위해 시스템 점검을 진행하고 있습니다.'
    check (char_length(message) between 1 and 500),
  starts_at timestamptz,
  ends_at timestamptz,
  affected_features text[] not null default '{}',
  android_min_version text not null default '1.0.0'
    check (android_min_version ~ '^\d+\.\d+\.\d+$'),
  ios_min_version text not null default '1.0.0'
    check (ios_min_version ~ '^\d+\.\d+\.\d+$'),
  android_force_update boolean not null default false,
  ios_force_update boolean not null default false,
  android_store_url text check (android_store_url is null or char_length(android_store_url) <= 500),
  ios_store_url text check (ios_store_url is null or char_length(ios_store_url) <= 500),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (cardinality(affected_features) <= 12)
);

alter table public.app_service_status enable row level security;
revoke all on public.app_service_status from public, anon, authenticated;
grant all on public.app_service_status to service_role;

insert into public.app_service_status (id)
values (1)
on conflict (id) do nothing;
