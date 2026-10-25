-- 0087: Trainers manage the lectures (course_sessions) of the courses they
-- teach — add, edit and delete — alongside the verified owner, whose existing
-- course_sessions_write_owner policy is unchanged. A trainer can't touch
-- another course's lectures: teaches_course() is checked on both the old row
-- (using) and the new row (with check), so a lecture can't be moved into a
-- course they don't teach either.
-- Idempotent: safe to re-run.

drop policy if exists course_sessions_write_teacher on course_sessions;
create policy course_sessions_write_teacher on course_sessions
  for all to authenticated
  using (public.teaches_course(course_id))
  with check (public.teaches_course(course_id));

grant select, insert, update, delete on course_sessions to authenticated;

-- Check
select policyname from pg_policies where tablename = 'course_sessions' order by policyname;
