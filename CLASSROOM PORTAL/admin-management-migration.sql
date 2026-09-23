
-- ============================================
-- BSIS 1-A ADMIN MANAGEMENT + CONTENT
-- Run once after admin-auth-migration.sql.
-- ============================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_users
    where auth_user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Allow authorized admins to update student records.
drop policy if exists "Admins can update student records" on public.students;
create policy "Admins can update student records"
on public.students
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Admin-only delete policy retained separately; the UI no longer exposes
-- a bulk-delete button.
drop policy if exists "Admins can delete student records" on public.students;
create policy "Admins can delete student records"
on public.students
for delete
to authenticated
using (public.is_admin());

-- ============================================
-- ANNOUNCEMENTS
-- ============================================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists "Published announcements are readable" on public.announcements;
create policy "Published announcements are readable"
on public.announcements
for select
to authenticated
using (published = true or public.is_admin());

drop policy if exists "Admins manage announcements" on public.announcements;
create policy "Admins manage announcements"
on public.announcements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists announcements_created_at_idx
on public.announcements (created_at desc);

-- ============================================
-- CLASS INFORMATION
-- ============================================

create table if not exists public.class_information (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.class_information enable row level security;

drop policy if exists "Published class information is readable" on public.class_information;
create policy "Published class information is readable"
on public.class_information
for select
to authenticated
using (published = true or public.is_admin());

drop policy if exists "Admins manage class information" on public.class_information;
create policy "Admins manage class information"
on public.class_information
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists class_information_created_at_idx
on public.class_information (created_at desc);
