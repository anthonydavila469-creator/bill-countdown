create table if not exists public.template_drift_metrics (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.vendor_templates(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  total_runs integer not null default 0,
  null_rate numeric(6,5) not null default 0,
  correction_rate numeric(6,5) not null default 0,
  ai_fallback_rate numeric(6,5) not null default 0,
  avg_confidence numeric(6,5) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists template_drift_metrics_template_period_idx
  on public.template_drift_metrics(template_id, period_end desc);

create table if not exists public.template_shadow_runs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.vendor_templates(id) on delete set null,
  email_parse_run_id uuid not null references public.email_parse_runs(id) on delete cascade,
  candidate_template_id uuid not null references public.vendor_templates(id) on delete cascade,
  shadow_result jsonb not null default '{}'::jsonb,
  production_result jsonb not null default '{}'::jsonb,
  agreement_score numeric(6,5) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists template_shadow_runs_candidate_idx
  on public.template_shadow_runs(candidate_template_id, created_at desc);

create index if not exists template_shadow_runs_parse_run_idx
  on public.template_shadow_runs(email_parse_run_id, created_at desc);
