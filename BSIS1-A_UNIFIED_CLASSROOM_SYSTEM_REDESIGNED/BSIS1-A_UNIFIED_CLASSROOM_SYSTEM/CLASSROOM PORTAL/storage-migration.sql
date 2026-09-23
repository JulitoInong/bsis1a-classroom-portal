-- Student avatar storage
-- Run once in Supabase SQL Editor after the existing migration.

insert into storage.buckets (id, name, public)
values ('student-avatars', 'student-avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Students can upload own avatars" on storage.objects;
create policy "Students can upload own avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'student-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Students can update own avatars" on storage.objects;
create policy "Students can update own avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'student-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'student-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Students can delete own avatars" on storage.objects;
create policy "Students can delete own avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'student-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
