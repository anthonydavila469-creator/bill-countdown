create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  template_id uuid references public.vendor_templates(id) on delete set null,
  email_parse_run_id uuid not null references public.email_parse_runs(id) on delete cascade,
  event_type text not null,
  scope text not null default 'local',
  original_fields jsonb not null default '{}'::jsonb,
  corrected_fields jsonb not null default '{}'::jsonb,
  field_deltas jsonb not null default '{}'::jsonb,
  anchor_windows jsonb not null default '{}'::jsonb,
  label_positions jsonb not null default '{}'::jsonb,
  dom_fingerprint text,
  subject_shape text not null,
  sender_domain text,
  created_at timestamptz not null default now(),
  constraint learning_events_event_type_check check (event_type in ('correction', 'confirmation', 'rejection')),
  constraint learning_events_scope_check check (scope in ('local', 'global_opt_in'))
);

create index if not exists learning_events_vendor_user_idx on public.learning_events(vendor_id, user_id, created_at desc);
create index if not exists learning_events_template_idx on public.learning_events(template_id, created_at desc);
create index if not exists learning_events_parse_run_idx on public.learning_events(email_parse_run_id);
create index if not exists learning_events_cluster_idx on public.learning_events(vendor_id, subject_shape, sender_domain, created_at desc);
create index if not exists learning_events_user_idx on public.learning_events(user_id, created_at desc);
