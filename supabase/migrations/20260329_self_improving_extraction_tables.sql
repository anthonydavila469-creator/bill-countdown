create table if not exists public.bill_scan_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  source_type text not null check (source_type in ('camera', 'photo_library', 'document_scanner', 'quick_add')),
  image_hash text,
  image_storage_path text,
  image_width integer,
  image_height integer,
  file_size_bytes integer,
  document_classification text check (document_classification in ('bill', 'possible_bill', 'non_bill', 'unknown')),
  classification_confidence real,
  vendor_guess_raw text,
  vendor_guess_normalized text,
  model_name text,
  prompt_version text,
  extraction_status text not null default 'pending' check (extraction_status in ('pending', 'success', 'failed', 'rejected', 'needs_review')),
  error_code text,
  latency_ms integer,
  estimated_cost_usd real,
  created_bill_id uuid references public.bills(id) on delete set null
);

create table if not exists public.bill_extraction_results (
  id uuid primary key default gen_random_uuid(),
  scan_session_id uuid not null references public.bill_scan_sessions(id) on delete cascade,
  model_name text not null,
  prompt_version text,
  raw_json jsonb,
  name_raw text,
  amount_raw numeric,
  due_date_raw text,
  name_normalized text,
  amount_normalized numeric,
  due_date_normalized date,
  confidence_name real,
  confidence_amount real,
  confidence_due_date real,
  overall_confidence real,
  evidence_vendor_text text,
  evidence_amount_text text,
  evidence_due_date_text text,
  is_bill boolean,
  document_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.bill_corrections (
  id uuid primary key default gen_random_uuid(),
  scan_session_id uuid not null references public.bill_scan_sessions(id) on delete cascade,
  extraction_result_id uuid references public.bill_extraction_results(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_id uuid references public.bills(id) on delete set null,
  field_name text not null,
  ai_value text,
  final_value text,
  was_changed boolean not null default false,
  change_type text check (change_type in ('exact_fix', 'normalization', 'replacement', 'cleared', 'manual_fill')),
  created_at timestamptz not null default now()
);

create index if not exists bill_scan_sessions_user_id_idx
  on public.bill_scan_sessions(user_id);

create index if not exists bill_scan_sessions_created_at_idx
  on public.bill_scan_sessions(created_at desc);

create index if not exists bill_extraction_results_scan_session_id_idx
  on public.bill_extraction_results(scan_session_id);

create index if not exists bill_extraction_results_created_at_idx
  on public.bill_extraction_results(created_at desc);

create index if not exists bill_corrections_user_id_idx
  on public.bill_corrections(user_id);

create index if not exists bill_corrections_scan_session_id_idx
  on public.bill_corrections(scan_session_id);

alter table public.bill_scan_sessions enable row level security;
alter table public.bill_extraction_results enable row level security;
alter table public.bill_corrections enable row level security;

create policy "Users can view own bill scan sessions"
  on public.bill_scan_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own bill scan sessions"
  on public.bill_scan_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bill scan sessions"
  on public.bill_scan_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own bill scan sessions"
  on public.bill_scan_sessions for delete
  using (auth.uid() = user_id);

create policy "Users can view own bill extraction results"
  on public.bill_extraction_results for select
  using (
    exists (
      select 1
      from public.bill_scan_sessions
      where bill_scan_sessions.id = bill_extraction_results.scan_session_id
        and bill_scan_sessions.user_id = auth.uid()
    )
  );

create policy "Users can insert own bill extraction results"
  on public.bill_extraction_results for insert
  with check (
    exists (
      select 1
      from public.bill_scan_sessions
      where bill_scan_sessions.id = bill_extraction_results.scan_session_id
        and bill_scan_sessions.user_id = auth.uid()
    )
  );

create policy "Users can update own bill extraction results"
  on public.bill_extraction_results for update
  using (
    exists (
      select 1
      from public.bill_scan_sessions
      where bill_scan_sessions.id = bill_extraction_results.scan_session_id
        and bill_scan_sessions.user_id = auth.uid()
    )
  );

create policy "Users can delete own bill extraction results"
  on public.bill_extraction_results for delete
  using (
    exists (
      select 1
      from public.bill_scan_sessions
      where bill_scan_sessions.id = bill_extraction_results.scan_session_id
        and bill_scan_sessions.user_id = auth.uid()
    )
  );

create policy "Users can view own bill corrections"
  on public.bill_corrections for select
  using (auth.uid() = user_id);

create policy "Users can insert own bill corrections"
  on public.bill_corrections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bill corrections"
  on public.bill_corrections for update
  using (auth.uid() = user_id);

create policy "Users can delete own bill corrections"
  on public.bill_corrections for delete
  using (auth.uid() = user_id);
