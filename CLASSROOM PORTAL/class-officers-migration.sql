
-- ============================================
-- BSIS 1-A CLASS OFFICERS + ADMIN RECOGNITION
-- Run once in Supabase SQL Editor.
-- ============================================

create table if not exists public.class_officers (
  id uuid primary key default gen_random_uuid(),
  position text not null,
  student_id bigint not null unique references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.class_officers enable row level security;

drop policy if exists "Authenticated users can read class officers" on public.class_officers;
create policy "Authenticated users can read class officers"
on public.class_officers
for select
to authenticated
using (true);

drop policy if exists "Admins manage class officers" on public.class_officers;
create policy "Admins manage class officers"
on public.class_officers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists class_officers_student_id_idx
on public.class_officers(student_id);

-- Seed the officers supplied for BSIS 1-A.
-- Matching is done against the existing students.full_name.
-- If a name is not yet present in students, that row is skipped.
insert into public.class_officers (position, student_id)
select v.position, s.id
from (values
  ('President', 'Julito Inong'),
  ('Vice President', 'Renz Galo'),
  ('Secretary', 'Mica Moranos'),
  ('Treasurer', 'Rj Miles Labajo'),
  ('Auditor', 'Laureen Mae Ibarra'),
  ('PIO', 'Maica Octavio'),
  ('BUSS M', 'Client Gomez')
) as v(position, full_name)
join public.students s
  on lower(trim(s.full_name)) = lower(trim(v.full_name))
on conflict (student_id) do update
set position = excluded.position,
    updated_at = now();
