do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'apns_tokens'
      and column_name = 'token'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'apns_tokens'
      and column_name = 'device_token'
  ) then
    alter table public.apns_tokens rename column token to device_token;
  end if;
end $$;

alter table public.apns_tokens
  add column if not exists device_token text;

alter table public.apns_tokens
  alter column device_token set not null;

alter table public.apns_tokens
  alter column created_at set default now(),
  alter column updated_at set default now();

create unique index if not exists apns_tokens_device_token_idx
  on public.apns_tokens(device_token);

create index if not exists apns_tokens_user_id_idx
  on public.apns_tokens(user_id);

drop trigger if exists apns_tokens_updated_at on public.apns_tokens;
create trigger apns_tokens_updated_at
  before update on public.apns_tokens
  for each row execute function public.handle_updated_at();

create table if not exists public.sent_push_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  reminder_date date not null,
  sent_at timestamptz not null default now(),
  unique(user_id, bill_id, reminder_date)
);

create index if not exists sent_push_reminders_user_date_idx
  on public.sent_push_reminders(user_id, reminder_date);

alter table public.sent_push_reminders enable row level security;

do $$
begin
  create policy \"Users can read own sent push reminders\"
    on public.sent_push_reminders for select
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
