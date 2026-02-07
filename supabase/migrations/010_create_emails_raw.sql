-- Create emails_raw table to store raw emails for reprocessing
create table if not exists public.emails_raw (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  gmail_message_id text not null,
  subject text not null,
  from_address text not null,
  date_received timestamp with time zone not null,
  body_plain text,
  body_html text,
  body_cleaned text,  -- Preprocessed text (HTML stripped, footers removed)
  attachments jsonb default '[]'::jsonb,
  processed_at timestamp with time zone,
  created_at timestamp with time zone default now(),

  -- Unique constraint per user + gmail message
  constraint emails_raw_user_gmail_unique unique (user_id, gmail_message_id)
);

-- Indexes for efficient queries
create index if not exists emails_raw_user_id_idx on public.emails_raw(user_id);
create index if not exists emails_raw_gmail_message_id_idx on public.emails_raw(gmail_message_id);
create index if not exists emails_raw_date_received_idx on public.emails_raw(date_received desc);
create index if not exists emails_raw_processed_at_idx on public.emails_raw(processed_at) where processed_at is null;

-- Enable Row Level Security
alter table public.emails_raw enable row level security;

-- RLS Policies: Users can only access their own emails
create policy "Users can view own emails"
  on public.emails_raw for select
  using (auth.uid() = user_id);

create policy "Users can insert own emails"
  on public.emails_raw for insert
  with check (auth.uid() = user_id);

create policy "Users can update own emails"
  on public.emails_raw for update
  using (auth.uid() = user_id);

create policy "Users can delete own emails"
  on public.emails_raw for delete
  using (auth.uid() = user_id);
