-- Let either member end the private couple space without deleting their account.
-- The couple row owns all shared records through ON DELETE CASCADE, so ending the
-- space removes both memberships, anniversaries, calendar events and invite data.

create or replace function public.leave_couple_space()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select cm.couple_id
  into v_couple_id
  from public.couple_members cm
  where cm.user_id = v_user_id;

  if v_couple_id is null then
    raise exception '연결된 커플 공간이 없습니다.';
  end if;

  delete from public.couples c
  where c.id = v_couple_id
    and exists (
      select 1
      from public.couple_members cm
      where cm.couple_id = c.id
        and cm.user_id = v_user_id
    );

  if not found then
    raise exception '커플 공간 연결을 해제하지 못했습니다.';
  end if;

  return true;
end;
$$;

revoke all on function public.leave_couple_space() from public;
grant execute on function public.leave_couple_space() to authenticated;

notify pgrst, 'reload schema';
