-- 0084: enrolment confirmation email + registered-students roster.
--
-- 1) course_roster(course_id): an owner-only report of who enrolled in a
--    course (name, username, email, phone, enrolment date). Security-definer so
--    it can read auth.users emails and the private profile_contacts phones; it
--    refuses anyone who is not a verified owner.
-- 2) A trigger on every enrolment (free / paid / code all insert into
--    enrollments) asks the send-enrollment-email edge function to email the
--    student a confirmation + schedule. Guarded by the shared hook secret in
--    private.integration_secrets; a failing HTTP call never blocks enrolment.
-- Idempotent: safe to re-run.

create extension if not exists pg_net;

-- 1) Roster report (owner only).
create or replace function public.course_roster(p_course_id uuid)
returns table (
  student_id uuid,
  name text,
  username text,
  email text,
  phone text,
  enrolled_at timestamptz
)
language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if not public.is_verified_owner() then
    raise exception 'owner only';
  end if;
  return query
    select e.student_id, p.name, p.username, u.email::text, pc.phone, e.enrolled_at
    from public.enrollments e
    join public.profiles p on p.id = e.student_id
    left join auth.users u on u.id = e.student_id
    left join public.profile_contacts pc on pc.user_id = e.student_id
    where e.course_id = p_course_id
    order by e.enrolled_at desc;
end; $$;

revoke all on function public.course_roster(uuid) from anon;
grant execute on function public.course_roster(uuid) to authenticated;

-- 2) Enrolment confirmation email (fire-and-forget to the edge function).
create or replace function public.trg_enrollment_email()
returns trigger language plpgsql security definer set search_path = public, private, extensions as $$
declare
  v_secret text;
begin
  select value into v_secret from private.integration_secrets where name = 'xapi_hook_secret';
  if v_secret is null then
    return new; -- hook secret not configured yet; no-op
  end if;
  begin
    perform net.http_post(
      url := 'https://wdxziibfgkztphpzeieq.supabase.co/functions/v1/send-enrollment-email',
      body := jsonb_build_object('course_id', new.course_id, 'student_id', new.student_id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', v_secret)
    );
  exception when others then
    null; -- never let an email hiccup block the enrolment
  end;
  return new;
end; $$;

drop trigger if exists trg_enrollment_email on public.enrollments;
create trigger trg_enrollment_email
  after insert on public.enrollments
  for each row execute function public.trg_enrollment_email();

-- Check: the roster function exists and the trigger is wired.
select 'course_roster' as object, count(*) from pg_proc where proname = 'course_roster'
union all
select 'trg_enrollment_email', count(*) from information_schema.triggers where trigger_name = 'trg_enrollment_email';
