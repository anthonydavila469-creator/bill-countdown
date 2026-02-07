-- Add payment link extraction fields to bill_extractions table
alter table public.bill_extractions
  add column if not exists payment_url text,
  add column if not exists payment_confidence numeric(3,2) check (payment_confidence >= 0 and payment_confidence <= 1),
  add column if not exists payment_evidence jsonb default '{}'::jsonb,
  add column if not exists candidate_payment_links jsonb default '[]'::jsonb;

-- Add payment_url to bills table for auto-filled links
alter table public.bills
  add column if not exists payment_url text;

-- Create vendor_rules table for domain validation
create table if not exists public.vendor_rules (
  id uuid default gen_random_uuid() primary key,
  vendor_name text not null unique,
  allowed_payment_domains text[] not null default '{}',
  sender_patterns text[] not null default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for vendor lookups
create index if not exists vendor_rules_vendor_name_idx on public.vendor_rules(vendor_name);

-- Insert common vendor rules
insert into public.vendor_rules (vendor_name, allowed_payment_domains, sender_patterns) values
  ('Chase', array['chase.com', 'secure.chase.com', 'chaseonline.chase.com'], array['chase.com']),
  ('Verizon', array['verizon.com', 'my.verizon.com', 'vzw.com'], array['verizon.com', 'verizonwireless.com']),
  ('AT&T', array['att.com', 'my.att.com'], array['att.com', 'att.net']),
  ('T-Mobile', array['t-mobile.com', 'my.t-mobile.com'], array['t-mobile.com', 'tmobile.com']),
  ('Xfinity', array['xfinity.com', 'my.xfinity.com', 'comcast.com'], array['xfinity.com', 'comcast.com']),
  ('Spectrum', array['spectrum.net', 'my.spectrum.com'], array['spectrum.com', 'spectrum.net']),
  ('American Express', array['americanexpress.com', 'amex.com'], array['americanexpress.com', 'aexp.com']),
  ('Capital One', array['capitalone.com', 'myaccounts.capitalone.com'], array['capitalone.com']),
  ('Discover', array['discover.com', 'card.discover.com'], array['discover.com']),
  ('Citi', array['citibank.com', 'citi.com', 'online.citi.com'], array['citi.com', 'citibank.com']),
  ('Bank of America', array['bankofamerica.com', 'bofa.com'], array['bankofamerica.com', 'bofa.com']),
  ('Wells Fargo', array['wellsfargo.com', 'connect.secure.wellsfargo.com'], array['wellsfargo.com']),
  ('Netflix', array['netflix.com', 'help.netflix.com'], array['netflix.com']),
  ('Spotify', array['spotify.com', 'accounts.spotify.com'], array['spotify.com']),
  ('Disney+', array['disneyplus.com', 'disney.com'], array['disneyplus.com', 'disney.com']),
  ('GEICO', array['geico.com', 'myaccount.geico.com'], array['geico.com']),
  ('Progressive', array['progressive.com', 'my.progressive.com'], array['progressive.com']),
  ('State Farm', array['statefarm.com'], array['statefarm.com'])
on conflict (vendor_name) do nothing;

-- Enable RLS on vendor_rules (public read access for domain validation)
alter table public.vendor_rules enable row level security;

-- Allow authenticated users to read vendor rules
create policy "Authenticated users can read vendor rules"
  on public.vendor_rules for select
  to authenticated
  using (true);

-- Trigger to update updated_at
create trigger on_vendor_rules_updated
  before update on public.vendor_rules
  for each row
  execute function public.handle_updated_at();
