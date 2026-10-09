-- Institution trainee tracking.
--
-- 1) institution_courses: the owner links a (usually private, code-only) course
--    to an institution. Every student enrolled in that course is treated as one
--    of the institution's trainees.
-- 2) session_attendance: per-session attendance marked by the course teacher or
--    the owner.
-- 3) Two read-only RPCs for the institution dashboard (and the owner):
--    institution_courses_overview() and institution_trainee_report(course).
--    They are SECURITY DEFINER so the institution can see aggregated progress
--    of its own trainees without opening the underlying tables to it.
--
-- Idempotent: safe to re-run.

-- ── 1. Institution ↔ course links ─────────────────────────────────────────
create table if not exists public.institution_courses (
  institution_id uuid not null references public.institutions (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (institution_id, course_id)
);
create index if not exists institution_courses_course_idx on public.institution_courses (course_id);
alter table public.institution_courses enable row level security;

drop policy if exists inst_courses_select on public.institution_courses;
create policy inst_courses_select on public.institution_courses
  for select to authenticated
  using (institution_id = public.current_institution_id() or public.is_verified_owner());

drop policy if exists inst_courses_write_owner on public.institution_courses;
create policy inst_courses_write_owner on public.institution_courses
  for all to authenticated
  using (public.is_verified_owner())
  with check (public.is_verified_owner());

grant select, insert, delete on public.institution_courses to authenticated;

-- ── 2. Session attendance ─────────────────────────────────────────────────
create table if not exists public.session_attendance (
  session_id uuid not null references public.course_sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  present boolean not null default true,
  marked_by uuid references public.profiles (id) on delete set null,
  marked_at timestamptz not null default now(),
  primary key (session_id, student_id)
);
create index if not exists session_attendance_student_idx on public.session_attendance (student_id);
alter table public.session_attendance enable row level security;

-- Owner, or a teacher of the session's course, may mark attendance.
create or replace function public.can_mark_attendance(p_session_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_verified_owner() or exists (
    select 1 from course_sessions s
    where s.id = p_session_id and public.teaches_course(s.course_id)
  );
$$;
revoke execute on function public.can_mark_attendance(uuid) from public, anon;
grant execute on function public.can_mark_attendance(uuid) to authenticated;

drop policy if exists attendance_select on public.session_attendance;
create policy attendance_select on public.session_attendance
  for select to authenticated
  using (student_id = auth.uid() or public.can_mark_attendance(session_id));

drop policy if exists attendance_write on public.session_attendance;
create policy attendance_write on public.session_attendance
  for all to authenticated
  using (public.can_mark_attendance(session_id))
  with check (public.can_mark_attendance(session_id));

grant select, insert, update, delete on public.session_attendance to authenticated;

-- ── 3a. Courses overview for an institution ───────────────────────────────
-- The owner may pass any institution id; everyone else always gets their own
-- institution (the argument is ignored for them).
drop function if exists public.institution_courses_overview(uuid);
create function public.institution_courses_overview(p_institution_id uuid default null)
returns table (
  course_id uuid,
  title text,
  title_en text,
  trainees int,
  avg_progress int,
  certificates int,
  sessions_total int,
  sessions_held int
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_inst uuid;
begin
  if p_institution_id is not null and public.is_verified_owner() then
    v_inst := p_institution_id;
  else
    v_inst := public.current_institution_id();
  end if;
  if v_inst is null then
    return;
  end if;

  return query
  with linked as (
    select c.id, c.title, c.title_en
    from institution_courses ic
    join courses c on c.id = ic.course_id
    where ic.institution_id = v_inst
  ),
  prog as (
    -- Same rule as the app: each graded assignment adds grade/100 × 10 points, capped at 100.
    -- The CASE matters: least()/greatest() ignore NULLs, so a left-joined row with no
    -- submission would otherwise count as a full-mark 100.
    select e.course_id, e.student_id,
           least(100, round(coalesce(sum(case when s.grade is not null
                                              then greatest(0, least(100, s.grade)) end) / 10.0, 0)))::int as p
    from enrollments e
    left join assignments a on a.course_id = e.course_id
    left join submissions s on s.assignment_id = a.id and s.student_id = e.student_id
                           and s.status = 'graded' and s.grade is not null
    where e.course_id in (select id from linked)
    group by e.course_id, e.student_id
  )
  select l.id,
         l.title,
         l.title_en,
         (select count(*) from enrollments e where e.course_id = l.id)::int,
         coalesce((select round(avg(p.p)) from prog p where p.course_id = l.id), 0)::int,
         (select count(*) from certificate_issuances ci
            join enrollments e on e.course_id = ci.course_id and e.student_id = ci.student_id
           where ci.course_id = l.id)::int,
         (select count(*) from course_sessions cs where cs.course_id = l.id)::int,
         (select count(*) from course_sessions cs where cs.course_id = l.id and cs.session_date <= current_date)::int
  from linked l
  order by l.title;
end;
$$;
revoke execute on function public.institution_courses_overview(uuid) from public, anon;
grant execute on function public.institution_courses_overview(uuid) to authenticated;

-- ── 3b. Per-trainee report for one linked course ──────────────────────────
drop function if exists public.institution_trainee_report(uuid);
create function public.institution_trainee_report(p_course_id uuid)
returns table (
  student_id uuid,
  name text,
  username text,
  enrolled_at timestamptz,
  status text,
  progress int,
  assignments_total int,
  submitted int,
  graded int,
  avg_grade int,
  sessions_held int,
  attended int,
  cert_number text,
  cert_issued_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (
    select 1 from institution_courses ic
    where ic.course_id = p_course_id
      and (ic.institution_id = public.current_institution_id() or public.is_verified_owner())
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  with held as (
    select cs.id from course_sessions cs
    where cs.course_id = p_course_id and cs.session_date <= current_date
  )
  select e.student_id,
         coalesce(nullif(pr.certificate_name, ''), pr.name),
         pr.username,
         e.enrolled_at,
         e.status::text,
         -- progress: graded points, same rule as the app
         least(100, round(coalesce((
           select sum(case when s.grade is not null then greatest(0, least(100, s.grade)) end) / 10.0
           from submissions s join assignments a on a.id = s.assignment_id
           where a.course_id = p_course_id and s.student_id = e.student_id
             and s.status = 'graded' and s.grade is not null
         ), 0)))::int,
         -- assignments visible to this trainee (for everyone, or targeted at them)
         (select count(*) from assignments a
           where a.course_id = p_course_id
             and (a.target_all or exists (select 1 from assignment_targets t
                                          where t.assignment_id = a.id and t.student_id = e.student_id)))::int,
         (select count(*) from submissions s join assignments a on a.id = s.assignment_id
           where a.course_id = p_course_id and s.student_id = e.student_id
             and s.status in ('submitted', 'graded'))::int,
         (select count(*) from submissions s join assignments a on a.id = s.assignment_id
           where a.course_id = p_course_id and s.student_id = e.student_id
             and s.status = 'graded')::int,
         (select round(avg(s.grade)) from submissions s join assignments a on a.id = s.assignment_id
           where a.course_id = p_course_id and s.student_id = e.student_id
             and s.status = 'graded' and s.grade is not null)::int,
         (select count(*) from held)::int,
         (select count(*) from session_attendance sa
           where sa.student_id = e.student_id and sa.present and sa.session_id in (select id from held))::int,
         ci.cert_number,
         ci.issued_at
  from enrollments e
  join profiles pr on pr.id = e.student_id
  left join lateral (
    select c.cert_number, c.issued_at from certificate_issuances c
    where c.course_id = p_course_id and c.student_id = e.student_id
    order by c.issued_at desc limit 1
  ) ci on true
  where e.course_id = p_course_id
  order by 2;
end;
$$;
revoke execute on function public.institution_trainee_report(uuid) from public, anon;
grant execute on function public.institution_trainee_report(uuid) to authenticated;
