-- BSIS 1-A SAFE CLASS DIRECTORY
-- Run once in Supabase SQL Editor. This exposes only shared fields.

create or replace function public.get_student_directory()
returns table (
  student_no text,
  full_name text,
  avatar_url text,
  created_at timestamptz,
  position text
)
language sql
security definer
set search_path = public
stable
as $$
  select s.student_no, s.full_name, s.avatar_url, s.created_at, co.position
  from public.students s
  left join public.class_officers co on co.student_id = s.id
  where auth.uid() is not null
  order by s.created_at desc;
$$;

revoke all on function public.get_student_directory() from public;
grant execute on function public.get_student_directory() to authenticated;
