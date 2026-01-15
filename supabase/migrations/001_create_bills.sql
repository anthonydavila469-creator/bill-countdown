-- Create bills table
create table if not exists public.bills (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  amount decimal(10,2),
  due_date date not null,
  emoji text default '📄',
  category text,
  is_paid boolean default false,
  paid_at timestamp with time zone,
  is_recurring boolean default false,
  recurrence_interval text check (recurrence_interval in ('weekly', 'monthly', 'yearly')),
  source text default 'manual' check (source in ('manual', 'gmail')),
  gmail_message_id text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create index for faster queries
create index if not exists bills_user_id_idx on public.bills(user_id);
create index if not exists bills_due_date_idx on public.bills(due_date);
create index if not exists bills_is_paid_idx on public.bills(is_paid);

-- Enable Row Level Security
alter table public.bills enable row level security;

-- RLS Policies: Users can only access their own bills
create policy "Users can view own bills"
  on public.bills for select
  using (auth.uid() = user_id);

create policy "Users can insert own bills"
  on public.bills for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bills"
  on public.bills for update
  using (auth.uid() = user_id);

create policy "Users can delete own bills"
  on public.bills for delete
  using (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at on bill changes
create trigger on_bill_updated
  before update on public.bills
  for each row
  execute function public.handle_updated_at();
