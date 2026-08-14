-- Record merchant-store approval decisions made from the server-only admin console.

alter table public.merchant_stores
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'merchant_stores_review_note_length'
      and conrelid = 'public.merchant_stores'::regclass
  ) then
    alter table public.merchant_stores
      add constraint merchant_stores_review_note_length
      check (review_note is null or char_length(review_note) <= 500);
  end if;
end;
$$;

create index if not exists merchant_stores_approval_queue_idx
  on public.merchant_stores(approval_status, created_at desc);

comment on column public.merchant_stores.review_note is
  'Operator review note shown in the merchant approval workflow.';
comment on column public.merchant_stores.reviewed_at is
  'Timestamp of the latest operator decision.';
comment on column public.merchant_stores.reviewed_by is
  'Authenticated operator who made the latest decision.';
