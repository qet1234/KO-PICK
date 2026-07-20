create table if not exists public.app_users (
  id uuid primary key,
  provider varchar(30) not null,
  provider_user_id text not null,
  email text,
  display_name varchar(100) not null,
  image_url varchar(1000),
  role varchar(20) not null default 'USER' check (role in ('USER', 'ADMIN')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_user_id)
);

create index if not exists app_users_email_idx
  on public.app_users (lower(email))
  where email is not null;

do $$
begin
  if to_regclass('auth.users') is not null then
    execute $migration$
      insert into public.app_users (
        id, provider, provider_user_id, email, display_name, image_url, created_at, updated_at
      )
      select
        id,
        coalesce(raw_app_meta_data ->> 'provider', 'legacy'),
        coalesce(raw_user_meta_data ->> 'sub', id::text),
        email,
        coalesce(
          raw_user_meta_data ->> 'full_name',
          raw_user_meta_data ->> 'name',
          raw_user_meta_data ->> 'nickname',
          split_part(coalesce(email, 'KO-PICK 사용자'), '@', 1)
        ),
        coalesce(raw_user_meta_data ->> 'avatar_url', raw_user_meta_data ->> 'picture'),
        created_at,
        coalesce(updated_at, created_at)
      from auth.users
      on conflict (id) do nothing
    $migration$;
  end if;
end $$;

create table if not exists public.refresh_tokens (
  id uuid primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash varchar(64) not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  replaced_by_token_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists refresh_tokens_user_active_idx
  on public.refresh_tokens (user_id, expires_at)
  where revoked_at is null;
