alter table if exists public.couples
    add column if not exists invite_revoked_at timestamptz;

create table if not exists public.couple_invite_attempts (
    user_id uuid not null references public.app_users(id) on delete cascade,
    attempted_at timestamptz not null default now(),
    succeeded boolean not null default false
);

create index if not exists couple_invite_attempts_user_time_idx
    on public.couple_invite_attempts(user_id, attempted_at desc);

update public.couples
   set invite_expires_at = coalesce(invite_expires_at, now() + interval '24 hours')
 where invite_code_hash is not null
   and invite_used_at is null
   and invite_revoked_at is null;
