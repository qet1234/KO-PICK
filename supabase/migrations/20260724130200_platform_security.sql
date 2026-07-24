create or replace function private.is_space_member(
  target_space_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id is not null and exists (
    select 1
    from public.space_members
    where space_id = target_space_id
      and user_id = target_user_id
  );
$$;

create or replace function private.is_space_owner(
  target_space_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id is not null and exists (
    select 1
    from public.space_members
    where space_id = target_space_id
      and user_id = target_user_id
      and role = 'owner'
  );
$$;

grant execute on function private.is_space_member(uuid, uuid)
  to authenticated, service_role;
grant execute on function private.is_space_owner(uuid, uuid)
  to authenticated, service_role;

alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.space_calendar_events enable row level security;
alter table public.space_milestones enable row level security;
alter table public.space_invite_attempts enable row level security;
alter table public.space_reservation_plans enable row level security;
alter table public.space_reservation_candidates enable row level security;
alter table public.space_reservation_votes enable row level security;
alter table public.place_activity_events enable row level security;

drop policy if exists spaces_member_select on public.spaces;
create policy spaces_member_select
  on public.spaces
  for select
  to authenticated
  using ((select private.is_space_member(id)));

drop policy if exists space_members_member_select on public.space_members;
create policy space_members_member_select
  on public.space_members
  for select
  to authenticated
  using ((select private.is_space_member(space_id)));

drop policy if exists calendar_member_select on public.space_calendar_events;
create policy calendar_member_select
  on public.space_calendar_events
  for select
  to authenticated
  using ((select private.is_space_member(space_id)));

drop policy if exists calendar_member_insert on public.space_calendar_events;
create policy calendar_member_insert
  on public.space_calendar_events
  for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    and (select private.is_space_member(space_id))
  );

drop policy if exists calendar_member_update on public.space_calendar_events;
create policy calendar_member_update
  on public.space_calendar_events
  for update
  to authenticated
  using ((select private.is_space_member(space_id)))
  with check ((select private.is_space_member(space_id)));

drop policy if exists calendar_member_delete on public.space_calendar_events;
create policy calendar_member_delete
  on public.space_calendar_events
  for delete
  to authenticated
  using ((select private.is_space_member(space_id)));

drop policy if exists milestones_member_select on public.space_milestones;
create policy milestones_member_select
  on public.space_milestones
  for select
  to authenticated
  using ((select private.is_space_member(space_id)));

drop policy if exists milestones_member_insert on public.space_milestones;
create policy milestones_member_insert
  on public.space_milestones
  for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    and (select private.is_space_member(space_id))
  );

drop policy if exists milestones_member_update on public.space_milestones;
create policy milestones_member_update
  on public.space_milestones
  for update
  to authenticated
  using ((select private.is_space_member(space_id)))
  with check ((select private.is_space_member(space_id)));

drop policy if exists milestones_member_delete on public.space_milestones;
create policy milestones_member_delete
  on public.space_milestones
  for delete
  to authenticated
  using ((select private.is_space_member(space_id)));

drop policy if exists reservation_plans_member_select on public.space_reservation_plans;
create policy reservation_plans_member_select
  on public.space_reservation_plans
  for select
  to authenticated
  using ((select private.is_space_member(space_id)));

drop policy if exists reservation_candidates_member_select on public.space_reservation_candidates;
create policy reservation_candidates_member_select
  on public.space_reservation_candidates
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.space_reservation_plans p
      where p.id = plan_id
        and (select private.is_space_member(p.space_id))
    )
  );

drop policy if exists reservation_votes_member_select on public.space_reservation_votes;
create policy reservation_votes_member_select
  on public.space_reservation_votes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.space_reservation_candidates c
      join public.space_reservation_plans p on p.id = c.plan_id
      where c.id = candidate_id
        and (select private.is_space_member(p.space_id))
    )
  );

revoke all on public.spaces from anon, authenticated;
revoke all on public.space_members from anon, authenticated;
revoke all on public.space_invite_attempts from anon, authenticated;
revoke all on public.space_reservation_plans from anon, authenticated;
revoke all on public.space_reservation_candidates from anon, authenticated;
revoke all on public.space_reservation_votes from anon, authenticated;
revoke all on public.place_activity_events from anon, authenticated;

revoke all on public.space_calendar_events from anon, authenticated;
revoke all on public.space_milestones from anon, authenticated;

grant select on public.spaces, public.space_members,
  public.space_calendar_events, public.space_milestones,
  public.space_reservation_plans, public.space_reservation_candidates,
  public.space_reservation_votes
  to authenticated;

grant insert, update, delete on public.space_calendar_events,
  public.space_milestones
  to authenticated;

grant all on public.spaces, public.space_members,
  public.space_calendar_events, public.space_milestones,
  public.space_invite_attempts, public.space_reservation_plans,
  public.space_reservation_candidates, public.space_reservation_votes,
  public.place_activity_events
  to service_role;

grant usage, select on sequence public.space_invite_attempts_id_seq,
  public.place_activity_events_id_seq
  to service_role;
