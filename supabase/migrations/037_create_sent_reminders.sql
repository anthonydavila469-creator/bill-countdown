create table if not exists public.sent_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  reminder_date date not null,
  sent_at timestamptz not null default now(),
  unique (user_id, bill_id, reminder_date)
);

alter table public.sent_reminders enable row level security;

do $$ begin
  create policy "Users can read own sent reminders"
    on public.sent_reminders for select
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

create index if not exists idx_sent_reminders_user_date
  on public.sent_reminders (user_id, reminder_date desc);

create index if not exists idx_sent_reminders_bill
  on public.sent_reminders (bill_id, reminder_date desc);
