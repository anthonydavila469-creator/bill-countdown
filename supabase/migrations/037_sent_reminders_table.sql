create table sent_reminders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_id uuid not null references bills(id) on delete cascade,
  reminder_date date not null,
  sent_at timestamptz default now(),
  unique(user_id, bill_id, reminder_date)
);
