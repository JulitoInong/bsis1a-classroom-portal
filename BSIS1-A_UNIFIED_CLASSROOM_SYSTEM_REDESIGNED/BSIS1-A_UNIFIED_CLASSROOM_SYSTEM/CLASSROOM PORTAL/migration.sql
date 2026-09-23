-- BSIS 1-A student profile fields
-- Run this once in Supabase SQL Editor before using the updated frontend.

alter table public.students
  add column if not exists student_no text,
  add column if not exists birthday date,
  add column if not exists gmail text,
  add column if not exists normalized_name text;

-- Database-level duplicate protection for Student No. and Gmail.
create unique index if not exists students_student_no_unique
  on public.students (student_no)
  where student_no is not null and student_no <> '';

create unique index if not exists students_gmail_unique
  on public.students (lower(gmail))
  where gmail is not null and gmail <> '';

-- Name duplicate protection uses a normalized representation.
create unique index if not exists students_normalized_name_unique
  on public.students (normalized_name)
  where normalized_name is not null and normalized_name <> '';

-- Helpful indexes for admin searching.
create index if not exists students_full_name_idx
  on public.students (lower(full_name));

create index if not exists students_created_at_idx
  on public.students (created_at desc);


-- Google Auth/profile linkage
-- Run this after the existing migration when Google Sign-In is enabled.
alter table public.students
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists avatar_url text;

create unique index if not exists students_auth_user_id_unique
  on public.students (auth_user_id)
  where auth_user_id is not null;

create index if not exists students_auth_user_id_idx
  on public.students (auth_user_id);
