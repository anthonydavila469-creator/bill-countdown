create table if not exists public.vendor_prompt_hints (
  id uuid primary key default gen_random_uuid(),
  vendor_name text not null unique,
  aliases jsonb not null default '[]'::jsonb,
  hints jsonb not null default '[]'::jsonb,
  correction_count integer not null default 0,
  accuracy_before real,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vendor_prompt_hints_vendor_name_idx
  on public.vendor_prompt_hints(vendor_name);

alter table public.vendor_prompt_hints enable row level security;

create policy "Authenticated users can view vendor prompt hints"
  on public.vendor_prompt_hints for select
  using (auth.role() = 'authenticated');
