-- Build 21 APNs tokens schema upgrade
-- Moves existing APNs token storage to metadata + soft-delete model.

create extension if not exists pgcrypto;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'apns_tokens'
      and column_name = 'device_token'
  ) then
    alter table public.apns_tokens rename column device_token to token;
  end if;
end $$;

create table if not exists public.apns_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token varchar(255) not null unique,
  device_name text,
  created_at timestamptz not null default now(),
  last_verified_at timestamptz,
  is_active boolean not null default true
);

alter table public.apns_tokens
  alter column token type varchar(255);

alter table public.apns_tokens
  add column if not exists device_name text,
  add column if not exists last_verified_at timestamptz,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

update public.apns_tokens
set
  last_verified_at = coalesce(last_verified_at, now()),
  is_active = coalesce(is_active, true)
where last_verified_at is null
   or is_active is null;

alter table public.apns_tokens
  alter column is_active set default true,
  alter column created_at set default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'apns_tokens'
      and column_name = 'updated_at'
  ) then
    alter table public.apns_tokens drop column updated_at;
  end if;
end $$;

alter table public.apns_tokens
  drop constraint if exists apns_tokens_user_id_device_token_key,
  drop constraint if exists apns_tokens_user_id_token_key,
  drop constraint if exists apns_tokens_user_id_fkey;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'apns_tokens_token_key'
  ) then
    alter table public.apns_tokens add constraint apns_tokens_token_key unique (token);
  end if;
end $$;

alter table public.apns_tokens
  add constraint apns_tokens_user_id_fkey
  foreign key (user_id)
  references public.user_preferences(user_id)
  on delete cascade
  not valid;

create index if not exists apns_tokens_user_id_idx
  on public.apns_tokens(user_id);

create index if not exists apns_tokens_user_id_is_active_idx
  on public.apns_tokens(user_id, is_active);

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
      on public.apns_tokens
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
