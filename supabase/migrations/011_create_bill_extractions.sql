-- Create bill_extractions table to store extraction results with evidence
create table if not exists public.bill_extractions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  email_raw_id uuid references public.emails_raw on delete set null,

  -- Status tracking
  status text default 'pending' check (status in ('pending', 'needs_review', 'confirmed', 'rejected', 'auto_accepted')),

  -- Extracted data
  extracted_name text,
  extracted_amount numeric(10,2),
  extracted_due_date date,
  extracted_category text,

  -- Confidence scores (0.00 to 1.00)
  confidence_overall numeric(3,2) check (confidence_overall >= 0 and confidence_overall <= 1),
  confidence_amount numeric(3,2) check (confidence_amount >= 0 and confidence_amount <= 1),
  confidence_due_date numeric(3,2) check (confidence_due_date >= 0 and confidence_due_date <= 1),
  confidence_name numeric(3,2) check (confidence_name >= 0 and confidence_name <= 1),

  -- Evidence for debugging and user review
  evidence_snippets jsonb default '[]'::jsonb,  -- Array of { field, snippet, source }
  candidate_amounts jsonb default '[]'::jsonb,  -- Array of { value, context, keywordScore }
  candidate_dates jsonb default '[]'::jsonb,    -- Array of { value, context, keywordScore }

  -- AI metadata
  ai_model_used text,
  ai_raw_response text,
  ai_tokens_used integer,

  -- Duplicate detection
  is_duplicate boolean default false,
  duplicate_of_bill_id uuid references public.bills on delete set null,
  duplicate_reason text,

  -- User corrections (when status = 'confirmed')
  user_corrected_name text,
  user_corrected_amount numeric(10,2),
  user_corrected_due_date date,
  user_corrected_category text,
  reviewed_at timestamp with time zone,
  reviewed_by uuid references auth.users on delete set null,

  -- Link to created bill (after confirmation or auto-accept)
  created_bill_id uuid references public.bills on delete set null,

  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes for efficient queries
create index if not exists bill_extractions_user_id_idx on public.bill_extractions(user_id);
create index if not exists bill_extractions_status_idx on public.bill_extractions(status);
create index if not exists bill_extractions_email_raw_id_idx on public.bill_extractions(email_raw_id);
create index if not exists bill_extractions_created_at_idx on public.bill_extractions(created_at desc);

-- Composite index for review queue queries
create index if not exists bill_extractions_review_queue_idx
  on public.bill_extractions(user_id, status, created_at desc)
  where status = 'needs_review';

-- Enable Row Level Security
alter table public.bill_extractions enable row level security;

-- RLS Policies: Users can only access their own extractions
create policy "Users can view own extractions"
  on public.bill_extractions for select
  using (auth.uid() = user_id);

create policy "Users can insert own extractions"
  on public.bill_extractions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own extractions"
  on public.bill_extractions for update
  using (auth.uid() = user_id);

create policy "Users can delete own extractions"
  on public.bill_extractions for delete
  using (auth.uid() = user_id);

-- Trigger to update updated_at on changes
create trigger on_bill_extraction_updated
  before update on public.bill_extractions
  for each row
  execute function public.handle_updated_at();
