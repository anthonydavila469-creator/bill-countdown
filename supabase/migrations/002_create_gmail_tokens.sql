-- Gmail tokens table for storing OAuth credentials
-- Note: In production, encrypt the tokens before storage

create table if not exists public.gmail_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  email text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamp with time zone not null,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.gmail_tokens enable row level security;

-- Policies: Users can only access their own tokens
create policy "Users can view own gmail tokens" on public.gmail_tokens
  for select using (auth.uid() = user_id);

create policy "Users can insert own gmail tokens" on public.gmail_tokens
  for insert with check (auth.uid() = user_id);

create policy "Users can update own gmail tokens" on public.gmail_tokens
  for update using (auth.uid() = user_id);

create policy "Users can delete own gmail tokens" on public.gmail_tokens
  for delete using (auth.uid() = user_id);

-- Index for faster lookups
create index idx_gmail_tokens_user_id on public.gmail_tokens(user_id);

-- Trigger to update updated_at on changes
create or replace function update_gmail_tokens_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger gmail_tokens_updated_at
  before update on public.gmail_tokens
  for each row execute function update_gmail_tokens_updated_at();
