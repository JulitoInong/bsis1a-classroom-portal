-- BSIS 1-A ADMIN STUDENT DELETE SUPPORT
-- Run once in Supabase SQL Editor after admin-management-migration.sql.
--
-- The existing admin-management migration already grants admins permission
-- to delete rows from public.students. This migration additionally allows an
-- authenticated administrator to remove a student's stored avatar object
-- when the frontend performs record cleanup.
--
-- This does NOT delete the student's Google/Auth account. The student record
-- references auth.users with ON DELETE SET NULL, so the Auth account remains
-- separate from the classroom record.

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

drop policy if exists "Admins can delete student records" on public.students;
create policy "Admins can delete student records"
on public.students
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admins can delete student avatars" on storage.objects;
create policy "Admins can delete student avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'student-avatars'
  and public.is_admin()
);
