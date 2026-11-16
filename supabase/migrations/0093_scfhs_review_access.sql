-- 0093: SCFHS review round 2 - reviewer access and demo-friendly check-in.
--
-- The SCFHS reviewer could not sign in: the admin login needs a code emailed
-- to the account, which an external reviewer never receives. This adds:
--
-- 1) profiles.otp_exempt_until - a temporary admin minted for the review
--    (create-admin with reviewDays) signs in WITHOUT the emailed code until
--    this time; after it, the normal code is required again (so the account
--    is effectively locked). Only the service role (Edge Functions) can set
--    it: a client write is silently reverted by a trigger.
-- 2) course_sessions.checkin_always_open - a demo session whose self
--    check-in link stays open, so the reviewer can try the direct attendance
--    link at any time. cpd_checkin_info / cpd_self_checkin honour it.
-- 3) cpd_public_indicators() - aggregate CPD indicators (counts and rates
--    only, no personal data) for the public /cpd page: learning resources,
--    usage rate, LMS satisfaction, pass and attendance rates.
--
-- Idempotent: safe to re-run. Run AFTER 0090, 0091 and 0092.

-- 1. Review-account code exemption ------------------------------------------
alter table public.profiles add column if not exists otp_exempt_until timestamptz;

create or replace function public.guard_profile_otp_exempt()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null only for the service role (Edge Functions).
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.otp_exempt_until := null;
    elsif new.otp_exempt_until is distinct from old.otp_exempt_until then
      new.otp_exempt_until := old.otp_exempt_until;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_profile_otp_exempt on profiles;
create trigger trg_guard_profile_otp_exempt
  before insert or update on profiles
  for each row execute function public.guard_profile_otp_exempt();

-- 2. Always-open demo check-in ----------------------------------------------
alter table public.course_sessions
  add column if not exists checkin_always_open boolean not null default false;

drop function if exists public.cpd_checkin_info(uuid);
create function public.cpd_checkin_info(p_session_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_s record;
  v_present boolean;
  v_enrolled boolean;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select s.id, s.title, s.session_date, s.session_time, s.course_id, s.checkin_always_open,
         c.title as course_title
    into v_s
    from course_sessions s join courses c on c.id = s.course_id
   where s.id = p_session_id;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  v_enrolled := exists (
    select 1 from enrollments e where e.course_id = v_s.course_id and e.student_id = auth.uid()
  );
  select a.present into v_present
    from session_attendance a
   where a.session_id = p_session_id and a.student_id = auth.uid();

  return jsonb_build_object(
    'status', 'ok',
    'session_id', v_s.id,
    'title', v_s.title,
    'course_id', v_s.course_id,
    'course_title', v_s.course_title,
    'session_date', v_s.session_date,
    'session_time', v_s.session_time,
    'enrolled', v_enrolled,
    'present', v_present,
    'always_open', v_s.checkin_always_open,
    'window', case when v_s.checkin_always_open then 'open'
                   else public.cpd_checkin_window(v_s.session_date, v_s.session_time) end
  );
end;
$$;
revoke execute on function public.cpd_checkin_info(uuid) from public, anon;
grant execute on function public.cpd_checkin_info(uuid) to authenticated;

drop function if exists public.cpd_self_checkin(uuid);
create function public.cpd_self_checkin(p_session_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_s record;
  v_window text;
  v_existing boolean;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select s.id, s.course_id, s.session_date, s.session_time, s.checkin_always_open into v_s
    from course_sessions s where s.id = p_session_id;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if not exists (
    select 1 from enrollments e where e.course_id = v_s.course_id and e.student_id = auth.uid()
  ) then
    return jsonb_build_object('status', 'not_enrolled');
  end if;

  select a.present into v_existing
    from session_attendance a
   where a.session_id = p_session_id and a.student_id = auth.uid();
  if found then
    return jsonb_build_object('status', 'already', 'present', v_existing);
  end if;

  v_window := case when v_s.checkin_always_open then 'open'
                   else public.cpd_checkin_window(v_s.session_date, v_s.session_time) end;
  if v_window = 'early' then
    return jsonb_build_object('status', 'too_early');
  elsif v_window = 'closed' then
    return jsonb_build_object('status', 'closed');
  end if;

  insert into session_attendance (session_id, student_id, present, marked_by, marked_at, method)
  values (p_session_id, auth.uid(), true, auth.uid(), now(), 'self')
  on conflict (session_id, student_id) do nothing;

  return jsonb_build_object('status', 'checked_in', 'at', now());
end;
$$;
revoke execute on function public.cpd_self_checkin(uuid) from public, anon;
grant execute on function public.cpd_self_checkin(uuid) to authenticated;

-- 3. Public CPD indicators (aggregates only) --------------------------------
drop function if exists public.cpd_public_indicators();
create function public.cpd_public_indicators()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v jsonb;
begin
  with cpd_courses as (
    select id from courses where cpd is not null
  ),
  learners as (
    select distinct e.student_id from enrollments e join cpd_courses c on c.id = e.course_id
  ),
  users_of_resources as (
    select distinct p.student_id from course_material_progress p join cpd_courses c on c.id = p.course_id
  ),
  evals as (
    select ev.ratings from course_evaluations ev join cpd_courses c on c.id = ev.course_id
  ),
  best as (
    select distinct on (q.course_id, q.student_id) q.passed
      from quiz_attempts q join cpd_courses c on c.id = q.course_id
     order by q.course_id, q.student_id, q.score desc
  ),
  att as (
    select a.present from session_attendance a
      join course_sessions s on s.id = a.session_id
      join cpd_courses c on c.id = s.course_id
  )
  select jsonb_build_object(
    'activities', (select count(*) from cpd_courses),
    'resources_total', (select count(*) from course_materials m join cpd_courses c on c.id = m.course_id where m.published),
    'resources_by_kind', coalesce((
        select jsonb_object_agg(kind, n) from (
          select m.kind, count(*) as n from course_materials m join cpd_courses c on c.id = m.course_id
           where m.published group by m.kind
        ) k
      ), '{}'::jsonb),
    'learners', (select count(*) from learners),
    'learners_using_resources', (select count(*) from users_of_resources u where u.student_id in (select student_id from learners)),
    'evaluations', (select count(*) from evals),
    'lms_rated', (select count(*) from evals where (ratings->>'platform') ~ '^[0-9]+$'),
    'lms_satisfied', (select count(*) from evals where (ratings->>'platform') ~ '^[0-9]+$' and (ratings->>'platform')::int >= 4),
    'overall_rated', (select count(*) from evals where (ratings->>'overall') ~ '^[0-9]+$'),
    'overall_satisfied', (select count(*) from evals where (ratings->>'overall') ~ '^[0-9]+$' and (ratings->>'overall')::int >= 4),
    'quiz_takers', (select count(*) from best),
    'quiz_passed', (select count(*) from best where passed),
    'attendance_marks', (select count(*) from att),
    'attendance_present', (select count(*) from att where present),
    'as_of', now()
  ) into v;
  return v;
end;
$$;
grant execute on function public.cpd_public_indicators() to anon, authenticated;

-- Verify
select 'profiles.otp_exempt_until' as object, count(*) from information_schema.columns
 where table_name = 'profiles' and column_name = 'otp_exempt_until'
union all
select 'course_sessions.checkin_always_open', count(*) from information_schema.columns
 where table_name = 'course_sessions' and column_name = 'checkin_always_open'
union all
select 'rpcs', count(*) from pg_proc
 where proname in ('cpd_checkin_info', 'cpd_self_checkin', 'cpd_public_indicators', 'guard_profile_otp_exempt');
