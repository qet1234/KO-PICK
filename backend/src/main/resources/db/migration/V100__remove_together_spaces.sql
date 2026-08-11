-- Keep the legacy Spring schema aligned with the discontinued feature.
drop table if exists public.space_reservation_votes cascade;
drop table if exists public.space_reservation_candidates cascade;
drop table if exists public.space_calendar_events cascade;
drop table if exists public.space_reservation_plans cascade;
drop table if exists public.space_milestones cascade;
drop table if exists public.space_invite_attempts cascade;
drop table if exists public.space_members cascade;
drop table if exists public.spaces cascade;
drop table if exists public.couple_invite_attempts cascade;
drop table if exists public.couple_calendar_events cascade;
drop table if exists public.couple_anniversaries cascade;
drop table if exists public.couple_members cascade;
drop table if exists public.couples cascade;
