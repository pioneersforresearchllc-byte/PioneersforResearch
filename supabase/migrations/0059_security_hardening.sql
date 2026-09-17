-- Security hardening — close broken-access-control gaps a logged-in student
-- could otherwise exploit. RLS is row-level (not column-level), so a permissive
-- INSERT/UPDATE policy let a student write privileged columns on their OWN
-- rows. These triggers enforce the column-level rules server-side.

-- ── (1) service_requests: a client could insert a request with status='paid',
--        a final price, or an assigned teacher — fabricating a paid service
--        subscription (and its workspace) without ever paying. Force safe
--        values on every non-owner insert. The Stripe webhook sets 'paid' via
--        UPDATE (service role), so it is unaffected. ────────────────────────
create or replace function public.guard_service_request_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_verified_owner() then
    new.status := 'pending';
    new.final_price_cents := null;
    new.assigned_teacher_id := null;
  end if;
  return new;
end; $$;

drop trigger if exists service_requests_guard_insert on service_requests;
create trigger service_requests_guard_insert
  before insert on service_requests
  for each row execute function public.guard_service_request_insert();

-- ── (2) submissions: the self-update policy (needed so a student can attach /
--        resubmit their answer before grading) also let them write the grade,
--        feedback and status columns on their own row — i.e. grade themselves.
--        Preserve those columns unless the updater is the course's teacher or a
--        verified owner. ─────────────────────────────────────────────────────
create or replace function public.guard_submission_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare is_staff boolean;
begin
  select public.is_verified_owner() or exists (
    select 1 from assignments a
    where a.id = new.assignment_id and public.teaches_course(a.course_id)
  ) into is_staff;

  if not is_staff then
    new.grade := old.grade;
    new.feedback := old.feedback;
    new.graded_at := old.graded_at;
    if new.status = 'graded' then
      new.status := old.status;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists submissions_guard_update on submissions;
create trigger submissions_guard_update
  before update on submissions
  for each row execute function public.guard_submission_update();

-- ── (3) messages: the update policy had a USING clause but no WITH CHECK, so a
--        student could edit one of their own messages and move it into a
--        conversation they don't belong to (message injection). Re-add the
--        policy with a WITH CHECK that keeps the message theirs and in a
--        conversation they are a member of. ─────────────────────────────────
drop policy if exists messages_update_own on messages;
create policy messages_update_own on messages
  for update to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));
