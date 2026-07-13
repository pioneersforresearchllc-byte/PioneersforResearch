-- Free courses (price_cents = 0) can be joined directly with no payment
-- step, and every course can optionally cap how many students may enroll
-- (null = unlimited). Capacity is just a courses column the owner can
-- raise any time by editing the course.

alter table courses add column capacity int;

create policy enrollments_insert_free on enrollments
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from courses c
      where c.id = course_id
        and c.price_cents = 0
        and (
          c.capacity is null
          or (select count(*) from enrollments e2 where e2.course_id = c.id) < c.capacity
        )
    )
  );
