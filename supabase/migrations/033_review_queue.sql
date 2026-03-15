alter table public.bills
  add column if not exists account_last4 text,
  add column if not exists review_reason text;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'bills_source_check'
  ) then
    alter table public.bills drop constraint bills_source_check;
  end if;

  alter table public.bills
    add constraint bills_source_check
    check (source in ('manual', 'gmail', 'yahoo', 'outlook'));

  if exists (
    select 1 from pg_constraint where conname = 'bills_recurrence_interval_check'
  ) then
    alter table public.bills drop constraint bills_recurrence_interval_check;
  end if;

  alter table public.bills
    add constraint bills_recurrence_interval_check
    check (recurrence_interval is null or recurrence_interval in ('weekly', 'biweekly', 'monthly', 'yearly'));

  if not exists (
    select 1 from pg_constraint where conname = 'bills_review_reason_check'
  ) then
    alter table public.bills
      add constraint bills_review_reason_check
      check (review_reason is null or review_reason in (
        'duplicate_uncertain',
        'low_confidence',
        'ai_disagreement',
        'missing_amount',
        'missing_due_date',
        'vendor_mismatch'
      ));
  end if;
end $$;

create table if not exists public.bill_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email_parse_run_id uuid not null references public.email_parse_runs(id) on delete cascade,
  bill_id uuid references public.bills(id) on delete set null,
  status text not null default 'pending',
  review_reason text not null,
  suggested_fields jsonb not null default '{}'::jsonb,
  user_corrected_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint bill_reviews_status_check check (status in ('pending', 'resolved', 'dismissed')),
  constraint bill_reviews_review_reason_check check (review_reason in (
    'duplicate_uncertain',
    'low_confidence',
    'ai_disagreement',
    'missing_amount',
    'missing_due_date',
    'vendor_mismatch'
  ))
);

create index if not exists bill_reviews_user_status_idx on public.bill_reviews(user_id, status, created_at desc);
create index if not exists bill_reviews_parse_run_idx on public.bill_reviews(email_parse_run_id);
create index if not exists bills_account_last4_idx on public.bills(user_id, account_last4);

alter table public.bill_reviews enable row level security;

create policy "Users can view own bill reviews"
  on public.bill_reviews for select
  using (auth.uid() = user_id);

create policy "Users can insert own bill reviews"
  on public.bill_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bill reviews"
  on public.bill_reviews for update
  using (auth.uid() = user_id);
