-- Merchant-owned reservation flow for 오늘어디.
-- Customers can only create/read their own requests; owners can only manage
-- requests for stores assigned to their authenticated account.

create table if not exists public.merchant_stores (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  place_source text not null check (place_source in ('TOUR_API', 'NAVER_LOCAL', 'MANUAL')),
  place_id text not null check (char_length(place_id) between 1 and 160),
  name text not null check (char_length(name) between 1 and 120),
  address text check (address is null or char_length(address) <= 300),
  phone text check (phone is null or char_length(phone) <= 30),
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_source, place_id)
);

create table if not exists public.merchant_reservations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.merchant_stores(id) on delete restrict,
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  guest_name text not null check (char_length(guest_name) between 1 and 60),
  customer_phone text not null check (char_length(customer_phone) between 8 and 30),
  reservation_date date not null,
  reservation_time time not null,
  party_size integer not null check (party_size between 1 and 30),
  menu text check (menu is null or char_length(menu) <= 120),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'seated', 'completed', 'rejected', 'cancelled', 'no_show')),
  source text not null default '오늘 어디',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists merchant_stores_owner_idx
  on public.merchant_stores(owner_user_id, approval_status);
create index if not exists merchant_reservations_store_schedule_idx
  on public.merchant_reservations(store_id, reservation_date, reservation_time);
create index if not exists merchant_reservations_customer_idx
  on public.merchant_reservations(customer_user_id, created_at desc);

alter table public.merchant_stores enable row level security;
alter table public.merchant_reservations enable row level security;

revoke all on public.merchant_stores from public, anon, authenticated;
revoke all on public.merchant_reservations from public, anon, authenticated;
grant select, insert on public.merchant_stores to authenticated;
grant select on public.merchant_reservations to authenticated;
grant update(status, updated_at) on public.merchant_reservations to authenticated;
grant all on public.merchant_stores, public.merchant_reservations to service_role;

drop policy if exists merchant_stores_owner_select on public.merchant_stores;
create policy merchant_stores_owner_select
on public.merchant_stores for select
to authenticated
using ((select auth.uid()) = owner_user_id);

drop policy if exists merchant_stores_owner_register on public.merchant_stores;
create policy merchant_stores_owner_register
on public.merchant_stores for insert
to authenticated
with check (
  (select auth.uid()) = owner_user_id
  and approval_status = 'pending'
);

drop policy if exists merchant_reservations_customer_select on public.merchant_reservations;
create policy merchant_reservations_customer_select
on public.merchant_reservations for select
to authenticated
using ((select auth.uid()) = customer_user_id);

drop policy if exists merchant_reservations_owner_select on public.merchant_reservations;
create policy merchant_reservations_owner_select
on public.merchant_reservations for select
to authenticated
using (
  exists (
    select 1 from public.merchant_stores store
    where store.id = store_id
      and store.owner_user_id = (select auth.uid())
  )
);

drop policy if exists merchant_reservations_owner_update on public.merchant_reservations;
create policy merchant_reservations_owner_update
on public.merchant_reservations for update
to authenticated
using (
  exists (
    select 1 from public.merchant_stores store
    where store.id = store_id
      and store.owner_user_id = (select auth.uid())
      and store.approval_status = 'approved'
  )
)
with check (
  exists (
    select 1 from public.merchant_stores store
    where store.id = store_id
      and store.owner_user_id = (select auth.uid())
      and store.approval_status = 'approved'
  )
);

create or replace function public.get_bookable_merchant_store(
  p_place_source text,
  p_place_id text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'id', store.id,
        'name', store.name,
        'address', store.address,
        'bookable', true
      )
      from public.merchant_stores store
      where store.place_source = upper(btrim(coalesce(p_place_source, '')))
        and store.place_id = left(btrim(coalesce(p_place_id, '')), 160)
        and store.approval_status = 'approved'
      limit 1
    ),
    jsonb_build_object('bookable', false)
  );
$$;

create or replace function public.create_merchant_reservation(
  p_place_source text,
  p_place_id text,
  p_reservation_date date,
  p_reservation_time time,
  p_party_size integer,
  p_guest_name text,
  p_customer_phone text,
  p_menu text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_store public.merchant_stores%rowtype;
  created_id uuid;
begin
  if actor is null then raise exception '로그인이 필요합니다.'; end if;
  if p_reservation_date < (now() at time zone 'Asia/Seoul')::date then
    raise exception '예약 날짜는 오늘 이후로 선택해 주세요.';
  end if;
  if p_party_size not between 1 and 30 then raise exception '인원은 1명 이상 30명 이하로 선택해 주세요.'; end if;
  if char_length(btrim(coalesce(p_guest_name, ''))) not between 1 and 60 then raise exception '예약자명을 확인해 주세요.'; end if;
  if char_length(btrim(coalesce(p_customer_phone, ''))) not between 8 and 30 then raise exception '연락처를 확인해 주세요.'; end if;

  select * into target_store
  from public.merchant_stores
  where place_source = upper(btrim(coalesce(p_place_source, '')))
    and place_id = left(btrim(coalesce(p_place_id, '')), 160)
    and approval_status = 'approved'
  limit 1;
  if target_store.id is null then raise exception '오늘어디 예약을 지원하지 않는 매장입니다.'; end if;

  insert into public.merchant_reservations(
    store_id, customer_user_id, guest_name, customer_phone,
    reservation_date, reservation_time, party_size, menu, note
  ) values (
    target_store.id, actor, btrim(p_guest_name), btrim(p_customer_phone),
    p_reservation_date, p_reservation_time, p_party_size,
    nullif(left(btrim(coalesce(p_menu, '')), 120), ''),
    nullif(left(btrim(coalesce(p_note, '')), 500), '')
  ) returning id into created_id;

  return jsonb_build_object('reservation_id', created_id, 'status', 'pending');
end;
$$;

create or replace function public.update_merchant_reservation_status(
  p_reservation_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized text := lower(btrim(coalesce(p_status, '')));
  changed integer;
begin
  if normalized not in ('confirmed', 'seated', 'completed', 'rejected', 'cancelled', 'no_show') then
    raise exception '지원하지 않는 예약 상태입니다.';
  end if;

  update public.merchant_reservations
  set status = normalized, updated_at = now()
  where id = p_reservation_id;
  get diagnostics changed = row_count;
  if changed = 0 then raise exception '변경할 수 있는 예약을 찾지 못했습니다.'; end if;
  return jsonb_build_object('reservation_id', p_reservation_id, 'status', normalized);
end;
$$;

revoke all on function public.get_bookable_merchant_store(text, text) from public;
revoke all on function public.create_merchant_reservation(text, text, date, time, integer, text, text, text, text) from public;
revoke all on function public.update_merchant_reservation_status(uuid, text) from public;
grant execute on function public.get_bookable_merchant_store(text, text) to anon, authenticated;
grant execute on function public.create_merchant_reservation(text, text, date, time, integer, text, text, text, text) to authenticated;
grant execute on function public.update_merchant_reservation_status(uuid, text) to authenticated;
