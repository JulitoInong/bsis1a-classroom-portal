-- ============================================
-- BSIS 1-A SCHEDULE / CLASS MODE
-- ============================================
-- Source of truth: BSIS_1A_All_Schedules_2026-2027.docx
--
-- The uploaded document distinguishes:
-- 1) REGULAR / ORIGINAL SCHEDULE — enrollment-form timetable.
-- 2) ASYNCHRONOUS / CURRENT SETUP — Tuesday is F2F; Monday,
--    Wednesday, Thursday and Friday are online days; Saturday
--    is listed separately.
--
-- IMPORTANT: The document does NOT provide specific subject/time
-- entries for the online days. Therefore this migration does not
-- invent an online timetable.
--
-- class_mode:
--   regular       = original enrollment-form schedule
--   f2f           = current Tuesday/Saturday F2F setup
--   online        = future/published online class entries when
--                   actual subject/time details are supplied
--   asynchronous  = future non-live asynchronous entries

create table if not exists public.class_schedule (
  id uuid primary key default gen_random_uuid(),
  class_mode text not null default 'regular',
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  subject text not null,
  instructor text,
  room text,
  notes text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_schedule_time_order check (end_time > start_time)
);

alter table public.class_schedule
  add column if not exists class_mode text;

update public.class_schedule
set class_mode = 'regular'
where class_mode is null;

alter table public.class_schedule
  alter column class_mode set default 'regular';

alter table public.class_schedule
  alter column class_mode set not null;

-- Replace the previous three-value constraint with the source-aware modes.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'class_schedule_class_mode_check'
      and conrelid = 'public.class_schedule'::regclass
  ) then
    alter table public.class_schedule
      drop constraint class_schedule_class_mode_check;
  end if;

  alter table public.class_schedule
    add constraint class_schedule_class_mode_check
    check (class_mode in ('regular','f2f','online','asynchronous'));
end $$;

alter table public.class_schedule enable row level security;

drop policy if exists "Students can read published schedule" on public.class_schedule;
drop policy if exists "Admins can read schedule" on public.class_schedule;
drop policy if exists "Admins can insert schedule" on public.class_schedule;
drop policy if exists "Admins can update schedule" on public.class_schedule;
drop policy if exists "Admins can delete schedule" on public.class_schedule;

create policy "Students can read published schedule"
on public.class_schedule
for select
to authenticated
using (published = true);

create policy "Admins can read schedule"
on public.class_schedule
for select
to authenticated
using (exists (
  select 1 from public.admin_users a
  where a.auth_user_id = auth.uid()
));

create policy "Admins can insert schedule"
on public.class_schedule
for insert
to authenticated
with check (exists (
  select 1 from public.admin_users a
  where a.auth_user_id = auth.uid()
));

create policy "Admins can update schedule"
on public.class_schedule
for update
to authenticated
using (exists (
  select 1 from public.admin_users a
  where a.auth_user_id = auth.uid()
))
with check (exists (
  select 1 from public.admin_users a
  where a.auth_user_id = auth.uid()
));

create policy "Admins can delete schedule"
on public.class_schedule
for delete
to authenticated
using (exists (
  select 1 from public.admin_users a
  where a.auth_user_id = auth.uid()
));

create index if not exists class_schedule_mode_day_time_idx
on public.class_schedule (class_mode, day_of_week, start_time);

create index if not exists class_schedule_published_idx
on public.class_schedule (published);

-- =========================================================
-- SOURCE-FAITHFUL BSIS 1-A DEFAULT SCHEDULE
-- =========================================================
-- Remove only this project's default rows, preserving administrator-created rows.
delete from public.class_schedule
where notes = 'BSIS1A-DEFAULT-2026-2027';

-- 1. REGULAR / ORIGINAL — enrollment-form schedule.
-- Instructor was not specified in the source document for this section.
insert into public.class_schedule
(class_mode, day_of_week, start_time, end_time, subject, instructor, room, notes, published)
values
('regular',1,'08:00','09:30','Ethics',null,'402','BSIS1A-DEFAULT-2026-2027',true),
('regular',3,'08:00','09:30','Ethics',null,'402','BSIS1A-DEFAULT-2026-2027',true),
('regular',1,'09:30','11:00','Introduction to Computing',null,'401','BSIS1A-DEFAULT-2026-2027',true),
('regular',3,'09:30','11:00','Introduction to Computing',null,'401','BSIS1A-DEFAULT-2026-2027',true),
('regular',1,'12:30','14:00','Computer Programming 1',null,'401','BSIS1A-DEFAULT-2026-2027',true),
('regular',3,'12:30','14:00','Computer Programming 1',null,'401','BSIS1A-DEFAULT-2026-2027',true),
('regular',1,'14:00','15:30','The Contemporary World',null,'402','BSIS1A-DEFAULT-2026-2027',true),
('regular',3,'14:00','15:30','The Contemporary World',null,'402','BSIS1A-DEFAULT-2026-2027',true),
('regular',2,'12:30','14:00','Understanding the Self',null,'402','BSIS1A-DEFAULT-2026-2027',true),
('regular',4,'12:30','14:00','Understanding the Self',null,'402','BSIS1A-DEFAULT-2026-2027',true),
('regular',2,'14:00','15:30','Philippine Indigenous Communities',null,'402','BSIS1A-DEFAULT-2026-2027',true),
('regular',4,'14:00','15:30','Philippine Indigenous Communities',null,'402','BSIS1A-DEFAULT-2026-2027',true),
('regular',2,'08:00','11:00','Physical Activities Towards Health and Fitness 1',null,'301','BSIS1A-DEFAULT-2026-2027',true),
('regular',6,'08:00','11:00','Physical Activities Towards Health and Fitness 1',null,'301','BSIS1A-DEFAULT-2026-2027',true),
('regular',2,'11:00','14:00','National Service Training Program 1 (CWTS 1)',null,'401','BSIS1A-DEFAULT-2026-2027',true),
('regular',6,'11:00','14:00','National Service Training Program 1 (CWTS 1)',null,'401','BSIS1A-DEFAULT-2026-2027',true);

-- 2. CURRENT F2F SETUP — Tuesday, room SS201.
insert into public.class_schedule
(class_mode, day_of_week, start_time, end_time, subject, instructor, room, notes, published)
values
('f2f',2,'08:00','09:00','The Contemporary World','GAMAO','SS201','BSIS1A-DEFAULT-2026-2027',true),
('f2f',2,'09:00','10:00','Understanding the Self','DAREOH','SS201','BSIS1A-DEFAULT-2026-2027',true),
('f2f',2,'10:00','11:00','Introduction to Computing','CASTAN0','SS201','BSIS1A-DEFAULT-2026-2027',true),
('f2f',2,'11:00','12:00','VACANT',null,'SS201','BSIS1A-DEFAULT-2026-2027',true),
('f2f',2,'13:00','14:00','Computer Programming 1','LAGDAMEN','SS201','BSIS1A-DEFAULT-2026-2027',true),
('f2f',2,'14:00','15:00','Ethics','CANTILLER','SS201','BSIS1A-DEFAULT-2026-2027',true),
('f2f',2,'15:00','16:00','VACANT',null,'SS201','BSIS1A-DEFAULT-2026-2027',true),
('f2f',2,'16:00','17:00','Philippine Indigenous Communities','MAMINTAL','SS201','BSIS1A-DEFAULT-2026-2027',true);

-- 3. SATURDAY — listed separately in the current setup.
insert into public.class_schedule
(class_mode, day_of_week, start_time, end_time, subject, instructor, room, notes, published)
values
('f2f',6,'09:00','10:00','NSTP 1','TUQUIB','SS201','BSIS1A-DEFAULT-2026-2027',true),
('f2f',6,'11:00','12:00','PE-1','MACAWAY','SS201','BSIS1A-DEFAULT-2026-2027',true);

-- 4. ONLINE DAYS — the document specifies the days only:
-- Monday, Wednesday, Thursday, Friday.
-- No subject/time rows are inserted because none were supplied.
