alter table public.email_parse_runs
  add column if not exists body_hash text,
  add column if not exists dom_fingerprint text,
  add column if not exists text_fingerprint text,
  add column if not exists subject_shape text,
  add column if not exists ai_corrections jsonb not null default '{}'::jsonb,
  add column if not exists reconciliation_decision text,
  add column if not exists reconciliation_confidence numeric(4,3),
  add column if not exists reconciled_bill_id uuid references public.bills(id) on delete set null,
  add column if not exists review_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'email_parse_runs_reconciliation_decision_check'
  ) then
    alter table public.email_parse_runs
      add constraint email_parse_runs_reconciliation_decision_check
      check (reconciliation_decision is null or reconciliation_decision in ('insert', 'update', 'skip', 'review'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'email_parse_runs_review_reason_check'
  ) then
    alter table public.email_parse_runs
      add constraint email_parse_runs_review_reason_check
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

create index if not exists email_parse_runs_body_hash_idx on public.email_parse_runs(body_hash);
create index if not exists email_parse_runs_text_fingerprint_idx on public.email_parse_runs(text_fingerprint);
create index if not exists email_parse_runs_subject_shape_idx on public.email_parse_runs(subject_shape);
create index if not exists email_parse_runs_reconciled_bill_idx on public.email_parse_runs(reconciled_bill_id);
