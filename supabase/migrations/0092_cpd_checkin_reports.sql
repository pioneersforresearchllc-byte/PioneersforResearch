-- 0092: SCFHS CPD phase 2 - learner self check-in link, per-activity
-- evaluation report, and platform-wide CPD indicators.
--
-- Builds on 0071 (session_attendance), 0086 (course_materials + progress),
-- 0090 (courses.cpd) and 0091 (quiz_attempts, course_evaluations).
--
-- 1) session_attendance.method - 'manual' (marked by trainer/owner) or 'self'
--    (learner checked in through the direct attendance link).
-- 2) cpd_checkin_info(session) / cpd_self_checkin(session) - the direct
--    attendance link /attend/<session id>. A learner enrolled in the activity
--    can check in from 30 minutes before the session starts until 4 hours
--    after (Asia/Riyadh time). A mark already made by a trainer is never
--    overwritten.
-- 3) cpd_activity_report(course) - owner / course trainer: enrolment,
--    attendance, assessment results, evaluation averages, per-speaker scores
--    and learner comments for one activity.
-- 4) cpd_platform_indicators() - owner only: the indicators SCFHS asks for
--    (learning resources, resource usage rate, LMS satisfaction rate, ...).
--
-- Idempotent: safe to re-run. Run AFTER 0090 and 0091.

-- 1. Attendance method
alter table public.session_attendance
  add column if not exists method text not null default 'manual';
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'session_attendance_method_check'
  ) then
    alter table public.session_attendance
      add constraint session_attendance_method_check check (method in ('manual', 'self'));
  end if;
end $$;

-- 2a. Check-in window helper: returns 'early' | 'open' | 'closed'.
create or replace function public.cpd_checkin_window(p_date date, p_time time)
returns text
language sql stable set search_path = public as $$
  select case
    when now() < ((p_date + p_time) at time zone 'Asia/Riyadh') - interval '30 minutes' then 'early'
    when now() > ((p_date + p_time) at time zone 'Asia/Riyadh') + interval '4 hours' then 'closed'
    else 'open'
  end;
$$;

-- 2b. What the check-in page shows before the learner presses the button.
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

  select s.id, s.title, s.session_date, s.session_time, s.course_id, c.title as course_title
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
    'window', public.cpd_checkin_window(v_s.session_date, v_s.session_time)
  );
end;
$$;
revoke execute on function public.cpd_checkin_info(uuid) from public, anon;
grant execute on function public.cpd_checkin_info(uuid) to authenticated;

-- 2c. The check-in itself.
-- Returns {status}: checked_in | already | not_enrolled | too_early | closed | not_found
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

  select s.id, s.course_id, s.session_date, s.session_time into v_s
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

  v_window := public.cpd_checkin_window(v_s.session_date, v_s.session_time);
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

-- 3. Per-activity report (owner or the activity's trainer).
drop function if exists public.cpd_activity_report(uuid);
create function public.cpd_activity_report(p_course_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_enrolled int;
  v_held int;
  v_present int;
  v_self int;
  v_quiz jsonb;
  v_eval jsonb;
  v_aspects jsonb;
  v_speakers jsonb;
  v_comments jsonb;
  v_materials jsonb;
begin
  if not (public.is_verified_owner() or public.teaches_course(p_course_id)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select count(*) into v_enrolled from enrollments where course_id = p_course_id;

  select count(*) into v_held
    from course_sessions
   where course_id = p_course_id
     and ((session_date + session_time) at time zone 'Asia/Riyadh') <= now();

  select count(*) filter (where a.present), count(*) filter (where a.present and a.method = 'self')
    into v_present, v_self
    from session_attendance a
    join course_sessions s on s.id = a.session_id
   where s.course_id = p_course_id;

  -- Assessment: best attempt per learner.
  select jsonb_build_object(
           'learners', count(*),
           'passed', count(*) filter (where passed),
           'avg_score', coalesce(round(avg(score)), 0)
         )
    into v_quiz
    from (
      select distinct on (student_id) student_id, score, passed
        from quiz_attempts
       where course_id = p_course_id
       order by student_id, score desc
    ) best;

  select jsonb_build_object(
           'responses', count(*),
           'recommend_yes', count(*) filter (where would_recommend is true),
           'recommend_answered', count(*) filter (where would_recommend is not null)
         )
    into v_eval
    from course_evaluations where course_id = p_course_id;

  select coalesce(jsonb_object_agg(k, avg_v), '{}'::jsonb) into v_aspects
    from (
      select r.key as k, round(avg((r.value)::numeric), 2) as avg_v
        from course_evaluations ev, jsonb_each_text(ev.ratings) r
       where ev.course_id = p_course_id and r.value ~ '^[0-9]+(\.[0-9]+)?$'
       group by r.key
    ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
           'name', name, 'responses', n, 'knowledge', k_avg, 'delivery', d_avg
         ) order by name), '[]'::jsonb)
    into v_speakers
    from (
      select sp->>'name' as name,
             count(*) as n,
             round(avg(nullif((sp->>'knowledge')::numeric, 0)), 2) as k_avg,
             round(avg(nullif((sp->>'delivery')::numeric, 0)), 2) as d_avg
        from course_evaluations ev, jsonb_array_elements(ev.speakers) sp
       where ev.course_id = p_course_id and coalesce(sp->>'name', '') <> ''
       group by sp->>'name'
    ) s;

  select coalesce(jsonb_agg(jsonb_build_object('comment', comments, 'at', submitted_at) order by submitted_at desc), '[]'::jsonb)
    into v_comments
    from (
      select comments, submitted_at from course_evaluations
       where course_id = p_course_id and coalesce(trim(comments), '') <> ''
       order by submitted_at desc limit 30
    ) c;

  select jsonb_build_object(
           'published', (select count(*) from course_materials where course_id = p_course_id and published),
           'learners_using', (select count(distinct student_id) from course_material_progress where course_id = p_course_id),
           'completions', (select count(*) from course_material_progress where course_id = p_course_id)
         )
    into v_materials;

  return jsonb_build_object(
    'enrolled', v_enrolled,
    'sessions_held', v_held,
    'present_marks', v_present,
    'self_checkins', v_self,
    'quiz', v_quiz,
    'evaluation', v_eval,
    'aspects', v_aspects,
    'speakers', v_speakers,
    'comments', v_comments,
    'materials', v_materials
  );
end;
$$;
revoke execute on function public.cpd_activity_report(uuid) from public, anon;
grant execute on function public.cpd_activity_report(uuid) to authenticated;

-- 4. Platform-wide CPD indicators (owner only).
-- A CPD activity = a course with CPD details (courses.cpd is not null).
drop function if exists public.cpd_platform_indicators();
create function public.cpd_platform_indicators()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v jsonb;
begin
  if not public.is_verified_owner() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

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
    select ev.* from course_evaluations ev join cpd_courses c on c.id = ev.course_id
  ),
  best as (
    select distinct on (q.course_id, q.student_id) q.passed, q.score
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
    'lms_avg', (select round(avg((ratings->>'platform')::numeric), 2) from evals where (ratings->>'platform') ~ '^[0-9]+$'),
    'overall_rated', (select count(*) from evals where (ratings->>'overall') ~ '^[0-9]+$'),
    'overall_satisfied', (select count(*) from evals where (ratings->>'overall') ~ '^[0-9]+$' and (ratings->>'overall')::int >= 4),
    'quiz_takers', (select count(*) from best),
    'quiz_passed', (select count(*) from best where passed),
    'attendance_marks', (select count(*) from att),
    'attendance_present', (select count(*) from att where present)
  ) into v;

  return v;
end;
$$;
revoke execute on function public.cpd_platform_indicators() from public, anon;
grant execute on function public.cpd_platform_indicators() to authenticated;

-- Verify
select 'session_attendance.method' as object, count(*) from information_schema.columns
 where table_name = 'session_attendance' and column_name = 'method'
union all
select 'cpd rpcs', count(*) from pg_proc
 where proname in ('cpd_checkin_info', 'cpd_self_checkin', 'cpd_activity_report', 'cpd_platform_indicators');
