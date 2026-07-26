-- "Access-code only" courses: no price, not purchasable — a student joins ONLY
-- by redeeming a private access code (redeem-course-code, service role). These
-- courses carry price_cents = 0, so they'd otherwise fall into the free-enrol
-- path; the RLS below is rewritten to exclude them, so the ONLY way in is the
-- code. Idempotent: safe to re-run.

alter table courses add column if not exists code_only boolean not null default false;

-- Free direct enrolment stays for genuinely free courses, but NOT for
-- code_only ones (those must go through the access code).
drop policy if exists enrollments_insert_free on enrollments;
create policy enrollments_insert_free on enrollments
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from courses c
      where c.id = course_id
        and c.price_cents = 0
        and not c.code_only
        and (
          c.capacity is null
          or (select count(*) from enrollments e2 where e2.course_id = c.id) < c.capacity
        )
    )
  );
