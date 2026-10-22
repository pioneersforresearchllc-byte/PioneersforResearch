-- 0083: NELC xAPI / LRS integration.
-- Sends real course-lifecycle events to the National eLearning Center's LRS so
-- completed courses can issue accredited certificates. A trigger on each event
-- (enrol / progress / completion / rating / certificate) asks the send-xapi
-- edge function (via pg_net) to build and POST the matching xAPI statement.
-- The function holds the LRS Basic-auth secrets; this layer only forwards the
-- event, guarded by a shared hook secret kept in private.integration_secrets
-- (NOT in git). A failing HTTP call never blocks the learner's action.
-- Idempotent: safe to re-run.

create extension if not exists pg_net;

-- 1) Learner national ID (required to issue accredited statements). 10 digits.
alter table public.profiles add column if not exists national_id text;
alter table public.profiles drop constraint if exists profiles_national_id_format;
alter table public.profiles
  add constraint profiles_national_id_format
  check (national_id is null or national_id ~ '^[0-9]{10}$');

-- 2) Audit log of every statement attempt (owner-readable only).
create table if not exists public.xapi_log (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  course_id uuid,
  student_id uuid,
  actor_national_id text,
  object_id text,
  verb text,
  statement jsonb,
  status int,
  response text,
  created_at timestamptz not null default now()
);
create index if not exists xapi_log_course_idx on public.xapi_log (course_id, created_at desc);
alter table public.xapi_log enable row level security;
drop policy if exists xapi_log_owner_read on public.xapi_log;
create policy xapi_log_owner_read on public.xapi_log
  for select to authenticated using (public.is_verified_owner());
-- Inserts are done by the edge function with the service role (bypasses RLS).

-- 3) Private store for the hook secret (never exposed to the API).
create schema if not exists private;
revoke all on schema private from anon, authenticated;
create table if not exists private.integration_secrets (
  name text primary key,
  value text not null
);
revoke all on private.integration_secrets from anon, authenticated;
-- Set once, matching the function's XAPI_HOOK_SECRET env (see deploy notes):
--   insert into private.integration_secrets(name, value)
--   values ('xapi_hook_secret', '<your-secret>')
--   on conflict (name) do update set value = excluded.value;

-- 4) Forwarder: POST the event to the send-xapi edge function with the secret.
create or replace function public.send_xapi_event(payload jsonb)
returns void
language plpgsql security definer set search_path = public, private, extensions as $$
declare
  v_secret text;
begin
  select value into v_secret from private.integration_secrets where name = 'xapi_hook_secret';
  if v_secret is null then
    return; -- not configured yet; no-op so nothing breaks before go-live
  end if;
  begin
    perform net.http_post(
      url := 'https://wdxziibfgkztphpzeieq.supabase.co/functions/v1/send-xapi',
      body := payload,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', v_secret)
    );
  exception when others then
    null; -- never let an LRS hiccup block the learner's action
  end;
end; $$;

-- 5) Per-event trigger functions.
create or replace function public.trg_xapi_enrolled()
returns trigger language plpgsql security definer set search_path = public, private, extensions as $$
begin
  perform public.send_xapi_event(jsonb_build_object(
    'event', 'enrolled', 'course_id', new.course_id, 'student_id', new.student_id));
  return new;
end; $$;

create or replace function public.trg_xapi_enroll_update()
returns trigger language plpgsql security definer set search_path = public, private, extensions as $$
begin
  if new.progress is distinct from old.progress and new.progress < 100 then
    perform public.send_xapi_event(jsonb_build_object(
      'event', 'progressed', 'course_id', new.course_id, 'student_id', new.student_id, 'progress', new.progress));
  end if;
  if (new.status = 'completed' and old.status is distinct from 'completed')
     or (new.progress = 100 and old.progress is distinct from 100) then
    perform public.send_xapi_event(jsonb_build_object(
      'event', 'completed', 'course_id', new.course_id, 'student_id', new.student_id));
  end if;
  return new;
end; $$;

create or replace function public.trg_xapi_earned()
returns trigger language plpgsql security definer set search_path = public, private, extensions as $$
begin
  perform public.send_xapi_event(jsonb_build_object(
    'event', 'earned', 'course_id', new.course_id, 'student_id', new.student_id, 'issuance_id', new.id));
  return new;
end; $$;

create or replace function public.trg_xapi_rated()
returns trigger language plpgsql security definer set search_path = public, private, extensions as $$
begin
  perform public.send_xapi_event(jsonb_build_object(
    'event', 'rated', 'course_id', new.course_id, 'student_id', new.student_id, 'stars', new.stars));
  return new;
end; $$;

-- 6) Wire the triggers.
drop trigger if exists trg_xapi_enrolled on public.enrollments;
create trigger trg_xapi_enrolled
  after insert on public.enrollments
  for each row execute function public.trg_xapi_enrolled();

drop trigger if exists trg_xapi_enroll_update on public.enrollments;
create trigger trg_xapi_enroll_update
  after update on public.enrollments
  for each row execute function public.trg_xapi_enroll_update();

drop trigger if exists trg_xapi_earned on public.certificate_issuances;
create trigger trg_xapi_earned
  after insert on public.certificate_issuances
  for each row execute function public.trg_xapi_earned();

drop trigger if exists trg_xapi_rated on public.course_ratings;
create trigger trg_xapi_rated
  after insert on public.course_ratings
  for each row execute function public.trg_xapi_rated();

-- Check: should list the 4 xAPI triggers.
select event_object_table as table_name, trigger_name
from information_schema.triggers
where trigger_name like 'trg_xapi_%'
order by 1, 2;
