-- 0090: SCFHS CPD (التعليم الطبي المستمر) readiness.
--
-- 1) courses.cpd (jsonb) — the CPD details SCFHS expects on every activity
--    page: target audience, SMART objectives, learning outcomes, methods,
--    assessment / pass mark, CPD hours + accreditation no., commercial
--    sponsorship disclosure, and each speaker's financial-relationship
--    disclosure. Public like the rest of the course row (courses select RLS).
-- 2) practitioner_info — a learner's SCFHS registration (classification) no.
--    and profession, needed to report CPD hours. Kept OUT of `profiles`
--    (readable by every signed-in user) — visible to the learner and the
--    platform owner only, like profile_contacts (0072).
-- 3) course_roster (0084) now also returns the SCFHS no. and profession so the
--    owner can export attendance for hour reporting.
--
-- Idempotent: safe to re-run.

-- 1) CPD details per course.
alter table public.courses add column if not exists cpd jsonb;

-- 2) Practitioner data (private).
create table if not exists public.practitioner_info (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  scfhs_number text check (scfhs_number is null or scfhs_number ~ '^[0-9A-Za-z-]{4,20}$'),
  profession text check (profession is null or char_length(profession) <= 120),
  updated_at timestamptz not null default now()
);
alter table public.practitioner_info enable row level security;

drop policy if exists practitioner_info_select on public.practitioner_info;
create policy practitioner_info_select on public.practitioner_info
  for select to authenticated
  using (user_id = auth.uid() or public.is_verified_owner());

drop policy if exists practitioner_info_insert on public.practitioner_info;
create policy practitioner_info_insert on public.practitioner_info
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_verified_owner());

drop policy if exists practitioner_info_update on public.practitioner_info;
create policy practitioner_info_update on public.practitioner_info
  for update to authenticated
  using (user_id = auth.uid() or public.is_verified_owner())
  with check (user_id = auth.uid() or public.is_verified_owner());

drop policy if exists practitioner_info_delete on public.practitioner_info;
create policy practitioner_info_delete on public.practitioner_info
  for delete to authenticated
  using (user_id = auth.uid() or public.is_verified_owner());

grant select, insert, update, delete on public.practitioner_info to authenticated;

-- 3) Roster with practitioner data (return type changes → drop first).
drop function if exists public.course_roster(uuid);
create function public.course_roster(p_course_id uuid)
returns table (
  student_id uuid,
  name text,
  username text,
  email text,
  phone text,
  scfhs_number text,
  profession text,
  enrolled_at timestamptz
)
language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if not public.is_verified_owner() then
    raise exception 'owner only';
  end if;
  return query
    select e.student_id, p.name, p.username, u.email::text, pc.phone, pi.scfhs_number, pi.profession, e.enrolled_at
    from public.enrollments e
    join public.profiles p on p.id = e.student_id
    left join auth.users u on u.id = e.student_id
    left join public.profile_contacts pc on pc.user_id = e.student_id
    left join public.practitioner_info pi on pi.user_id = e.student_id
    where e.course_id = p_course_id
    order by e.enrolled_at desc;
end; $$;

revoke all on function public.course_roster(uuid) from anon;
grant execute on function public.course_roster(uuid) to authenticated;

-- Check.
select 'courses.cpd' as object, count(*) from information_schema.columns where table_name = 'courses' and column_name = 'cpd'
union all
select 'practitioner_info', count(*) from information_schema.tables where table_name = 'practitioner_info'
union all
select 'course_roster', count(*) from pg_proc where proname = 'course_roster';
