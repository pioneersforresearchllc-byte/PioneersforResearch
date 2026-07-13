-- assignment_targets_select embedded a raw `exists (select 1 from
-- assignments a where ...)` subquery. Because that subquery runs through
-- assignments' own RLS, and assignments_select in turn queries
-- assignment_targets, the two policies call each other forever
-- ("infinite recursion detected in policy for relation assignments").
-- Wrapping the cross-table check in a security-definer function (the same
-- pattern already used by teaches_course/is_conversation_member) breaks the
-- cycle, since such functions bypass RLS on the tables they query internally.

create or replace function public.teaches_assignment_course(a_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from assignments a
    where a.id = a_id and public.teaches_course(a.course_id)
  );
$$;

drop policy assignment_targets_select on assignment_targets;
create policy assignment_targets_select on assignment_targets
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.is_verified_owner()
    or public.teaches_assignment_course(assignment_id)
  );

drop policy assignment_targets_write on assignment_targets;
create policy assignment_targets_write on assignment_targets
  for all to authenticated
  using (public.is_verified_owner() or public.teaches_assignment_course(assignment_id))
  with check (public.is_verified_owner() or public.teaches_assignment_course(assignment_id));
