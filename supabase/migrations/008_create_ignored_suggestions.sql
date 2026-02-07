-- Migration: Create ignored_suggestions table for tracking dismissed bill suggestions
-- This table stores Gmail message IDs that users have chosen to ignore

create table public.ignored_suggestions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  gmail_message_id text not null,
  ignored_at timestamp with time zone default now(),
  unique(user_id, gmail_message_id)
);

-- Create index for faster lookups by user
create index ignored_suggestions_user_id_idx on public.ignored_suggestions(user_id);

-- Enable Row Level Security
alter table public.ignored_suggestions enable row level security;

-- RLS Policies: Users can only access their own ignored suggestions
create policy "Users can view their own ignored suggestions"
  on public.ignored_suggestions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own ignored suggestions"
  on public.ignored_suggestions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own ignored suggestions"
  on public.ignored_suggestions for delete
  using (auth.uid() = user_id);
