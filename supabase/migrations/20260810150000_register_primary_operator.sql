-- Register the verified KO-PICK primary operator without exposing the email address.
-- The SHA-256 fingerprint is compared only inside the protected auth.users table.
create extension if not exists pgcrypto with schema extensions;

do $$
declare
  target_user_id uuid;
begin
  select id
    into target_user_id
  from auth.users
  where encode(
    extensions.digest(
      convert_to(lower(coalesce(email, '')), 'UTF8'),
      'sha256'
    ),
    'hex'
  ) = 'c6f4117eca2c8ebcfcfe58937453619a530ae85c818549e65ed13a718d7463b2'
  order by created_at asc
  limit 1;

  -- Local migration CI has no auth users. Production verification below the
  -- deployment workflow still fails unless the real operator is registered.
  if target_user_id is not null then
    insert into public.admin_users (user_id, created_by, note)
    values (target_user_id, target_user_id, 'Primary project operator')
    on conflict (user_id) do update
      set note = excluded.note;
  end if;
end;
$$;
