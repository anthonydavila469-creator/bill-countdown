do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'apns_tokens'
      and column_name = 'token'
  ) then
    alter table public.apns_tokens rename column token to device_token;
  end if;
end $$;

alter table if exists public.apns_tokens
  drop column if exists device_id;

create table if not exists public.apns_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, device_token)
);

create index if not exists apns_tokens_user_id_idx on public.apns_tokens(user_id);

alter table public.apns_tokens enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'apns_tokens'
      and policyname = 'Users can manage own APNs tokens'
  ) then
    create policy "Users can manage own APNs tokens"
      on public.apns_tokens for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.sent_push_reminders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  reminder_date date not null,
  sent_at timestamptz not null default now(),
  unique(user_id, bill_id, reminder_date)
);
