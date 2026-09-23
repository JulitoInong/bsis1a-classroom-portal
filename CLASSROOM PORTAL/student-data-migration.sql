-- BSIS 1-A centralized student attendance and grades
-- Run after migration.sql and admin-auth-migration.sql.

create table if not exists public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id bigint not null references public.students(id) on delete cascade,
  attendance_date date not null default current_date,
  status text not null default 'present' check (status in ('present', 'absent', 'late', 'excused')),
  marked_at timestamptz not null default now(),
  marked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, attendance_date)
);

create index if not exists student_attendance_date_idx
  on public.student_attendance (attendance_date desc);

create index if not exists student_attendance_student_idx
  on public.student_attendance (student_id, attendance_date desc);

alter table public.student_attendance enable row level security;

drop policy if exists "Students can read own attendance" on public.student_attendance;
create policy "Students can read own attendance"
on public.student_attendance
for select
to authenticated
using (
  exists (
    select 1 from public.students
    where students.id = student_attendance.student_id
      and students.auth_user_id = auth.uid()
  )
);

drop policy if exists "Students can mark own attendance" on public.student_attendance;

drop policy if exists "Admins manage attendance" on public.student_attendance;
create policy "Admins manage attendance"
on public.student_attendance
for all
to authenticated
using (exists (select 1 from public.admin_users where admin_users.auth_user_id = auth.uid()))
with check (exists (select 1 from public.admin_users where admin_users.auth_user_id = auth.uid()));

-- Grades and target GWA intentionally remain local-only in the browser for privacy.