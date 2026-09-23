
-- ============================================
-- BSIS 1-A ADMIN AUTHENTICATION
-- ============================================
-- Run this once in Supabase SQL Editor.
--
-- After running it, create one admin row using
-- the authenticated Google user's UUID.
--
-- Example (replace ONLY the UUID):
-- insert into public.admin_users (auth_user_id)
-- values ('YOUR-SUPABASE-AUTH-USER-UUID');

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "Admins can read own admin record" on public.admin_users;

create policy "Admins can read own admin record"
on public.admin_users
for select
to authenticated
using (auth.uid() = auth_user_id);

create index if not exists admin_users_auth_user_id_idx
on public.admin_users (auth_user_id);
