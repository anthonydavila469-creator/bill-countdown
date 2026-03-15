create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  vendor_key text not null unique,
  display_name text not null,
  category_default text,
  recurrence_default text,
  website_domain text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_category_default_check check (
    category_default is null or category_default in (
      'utilities', 'subscription', 'rent', 'housing', 'insurance',
      'phone', 'internet', 'credit_card', 'loan', 'health', 'other'
    )
  ),
  constraint vendors_recurrence_default_check check (
    recurrence_default is null or recurrence_default in ('weekly', 'biweekly', 'monthly', 'yearly')
  )
);

create table if not exists public.vendor_aliases (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  alias_type text not null,
  alias_value text not null,
  confidence numeric(4,3) not null default 0.900,
  created_at timestamptz not null default now(),
  constraint vendor_aliases_alias_type_check check (
    alias_type in ('domain', 'sender_email', 'sender_name', 'subject_anchor')
  ),
  constraint vendor_aliases_confidence_check check (confidence >= 0 and confidence <= 1),
  constraint vendor_aliases_unique unique (vendor_id, alias_type, alias_value)
);

create table if not exists public.vendor_templates (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  template_key text not null,
  version integer not null default 1,
  status text not null default 'candidate',
  scope text not null default 'global',
  owner_user_id uuid references auth.users(id) on delete set null,
  email_type text not null,
  source text not null default 'manual',
  matcher_config jsonb not null,
  extractor_config jsonb not null,
  postprocess_config jsonb not null default '{}'::jsonb,
  confidence_config jsonb not null default '{}'::jsonb,
  drift_config jsonb not null default '{}'::jsonb,
  precision_score numeric(5,4),
  recall_score numeric(5,4),
  eval_sample_size integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_templates_status_check check (status in ('candidate', 'active', 'disabled', 'archived')),
  constraint vendor_templates_scope_check check (scope in ('global', 'local')),
  constraint vendor_templates_email_type_check check (
    email_type in (
      'bill_due', 'statement_ready', 'autopay_notice', 'payment_confirmation',
      'subscription_renewal', 'receipt', 'promo', 'other'
    )
  ),
  constraint vendor_templates_source_check check (source in ('manual', 'learned', 'imported')),
  constraint vendor_templates_precision_score_check check (
    precision_score is null or (precision_score >= 0 and precision_score <= 1)
  ),
  constraint vendor_templates_recall_score_check check (
    recall_score is null or (recall_score >= 0 and recall_score <= 1)
  ),
  constraint vendor_templates_unique_version unique (vendor_id, template_key, version, scope, owner_user_id)
);

create table if not exists public.email_parse_runs (
  id uuid primary key default gen_random_uuid(),
  email_id uuid references public.emails_raw(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  classifier_version text,
  classifier_confidence numeric(4,3),
  vendor_resolution_version text,
  resolved_vendor_id uuid references public.vendors(id) on delete set null,
  vendor_resolution_confidence numeric(4,3),
  template_id uuid references public.vendor_templates(id) on delete set null,
  template_match_confidence numeric(4,3),
  ai_model text,
  ai_prompt_version text,
  ai_used boolean not null default false,
  ai_mode text,
  ai_confidence numeric(4,3),
  overall_confidence numeric(4,3),
  action_confidence numeric(4,3),
  decision text not null,
  parsed_fields jsonb not null default '{}'::jsonb,
  field_confidence jsonb not null default '{}'::jsonb,
  evidence_json jsonb not null default '{}'::jsonb,
  raw_ai_output jsonb,
  created_at timestamptz not null default now(),
  constraint email_parse_runs_ai_mode_check check (ai_mode is null or ai_mode in ('extract', 'verify')),
  constraint email_parse_runs_decision_check check (decision in ('accept', 'ai_verify', 'review', 'rejected')),
  constraint email_parse_runs_classifier_confidence_check check (
    classifier_confidence is null or (classifier_confidence >= 0 and classifier_confidence <= 1)
  ),
  constraint email_parse_runs_vendor_resolution_confidence_check check (
    vendor_resolution_confidence is null or (vendor_resolution_confidence >= 0 and vendor_resolution_confidence <= 1)
  ),
  constraint email_parse_runs_template_match_confidence_check check (
    template_match_confidence is null or (template_match_confidence >= 0 and template_match_confidence <= 1)
  ),
  constraint email_parse_runs_ai_confidence_check check (
    ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1)
  ),
  constraint email_parse_runs_overall_confidence_check check (
    overall_confidence is null or (overall_confidence >= 0 and overall_confidence <= 1)
  ),
  constraint email_parse_runs_action_confidence_check check (
    action_confidence is null or (action_confidence >= 0 and action_confidence <= 1)
  )
);

create index if not exists vendors_active_idx on public.vendors(active);
create index if not exists vendors_website_domain_idx on public.vendors(website_domain);

create index if not exists vendor_aliases_vendor_id_idx on public.vendor_aliases(vendor_id);
create index if not exists vendor_aliases_alias_lookup_idx on public.vendor_aliases(alias_type, lower(alias_value));

create index if not exists vendor_templates_vendor_id_idx on public.vendor_templates(vendor_id);
create index if not exists vendor_templates_owner_user_id_idx on public.vendor_templates(owner_user_id);
create index if not exists vendor_templates_status_scope_idx on public.vendor_templates(status, scope, email_type);
create index if not exists vendor_templates_lookup_idx on public.vendor_templates(vendor_id, status, email_type, version desc);

create index if not exists email_parse_runs_email_id_idx on public.email_parse_runs(email_id);
create index if not exists email_parse_runs_user_id_idx on public.email_parse_runs(user_id);
create index if not exists email_parse_runs_resolved_vendor_id_idx on public.email_parse_runs(resolved_vendor_id);
create index if not exists email_parse_runs_template_id_idx on public.email_parse_runs(template_id);
create index if not exists email_parse_runs_created_at_idx on public.email_parse_runs(created_at desc);
create index if not exists email_parse_runs_user_created_idx on public.email_parse_runs(user_id, created_at desc);
create index if not exists email_parse_runs_user_decision_idx on public.email_parse_runs(user_id, decision, created_at desc);
create index if not exists email_parse_runs_email_created_idx on public.email_parse_runs(email_id, created_at desc);

drop trigger if exists on_vendor_updated on public.vendors;
create trigger on_vendor_updated
  before update on public.vendors
  for each row
  execute function public.handle_updated_at();

drop trigger if exists on_vendor_template_updated on public.vendor_templates;
create trigger on_vendor_template_updated
  before update on public.vendor_templates
  for each row
  execute function public.handle_updated_at();
