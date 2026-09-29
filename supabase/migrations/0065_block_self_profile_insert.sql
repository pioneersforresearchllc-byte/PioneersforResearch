-- 0065 (URGENT): close self-promotion to owner / active teacher, plus other
-- client-writable privileged columns (consultations, submissions, articles, ratings).
--
-- profiles_insert_self (0002) let ANY signed-in user insert their own profile
-- row with any role and status. Since supabase.auth.signUp() hands out a
-- session before a profile exists, anyone could sign up, then insert
--   { id: <self>, role: 'owner', status: 'active' }
-- straight through the REST API, pass the owner OTP (it is emailed to their
-- own address) and get the full admin dashboard. Same trick gave an 'active'
-- teacher without approval.
--
-- Every legitimate profile is created server-side with the service role
-- (create-profile, create-admin, create-institution-member, create-ai-bot),
-- which bypasses RLS, so the client never needs this policy.
--
-- Also: a temporary admin could flip its own is_temp_admin to false through
-- profiles_update_self. Now only the service role or a permanent verified
-- owner may change that column.
-- Idempotent: safe to re-run.

drop policy if exists profiles_insert_self on profiles;

-- Backstop in case an insert policy is ever re-added by mistake.
create or replace function public.guard_profile_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Server-side inserts (service role / SQL editor) carry no end-user id.
  if auth.uid() is not null and not public.is_verified_owner() then
    raise exception 'profiles can only be created by the server';
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_profile_insert on profiles;
create trigger trg_guard_profile_insert
  before insert on profiles
  for each row execute function public.guard_profile_insert();

create or replace function public.guard_profile_temp_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_temp_admin is distinct from old.is_temp_admin
     and auth.uid() is not null
     and not (
       public.is_verified_owner()
       and not coalesce((select p.is_temp_admin from profiles p where p.id = auth.uid()), false)
     ) then
    new.is_temp_admin := old.is_temp_admin;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_profile_temp_admin on profiles;
create trigger trg_guard_profile_temp_admin
  before update on profiles
  for each row execute function public.guard_profile_temp_admin();

-- ── Same class of hole on other tables: a permissive INSERT policy let a
--    client write privileged columns on its own new row. ──────────────────

-- (a) institution_consultations: an institution could insert a consultation
--     already 'in_progress' (work without paying) or 'awaiting_payment' with a
--     price it chose itself (e.g. $0.50). Force safe values for non-owners.
create or replace function public.guard_consultation_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_verified_owner() then
    new.status := 'pending';
    new.final_price_cents := null;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_consultation_insert on institution_consultations;
create trigger trg_guard_consultation_insert
  before insert on institution_consultations
  for each row execute function public.guard_consultation_insert();

-- (b) submissions: 0059 guarded UPDATE, but a student could INSERT a
--     submission that is already graded (grade 100) by themselves.
create or replace function public.guard_submission_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_verified_owner() and not exists (
    select 1 from assignments a where a.id = new.assignment_id and public.teaches_course(a.course_id)
  ) then
    new.grade := null;
    new.feedback := null;
    new.graded_at := null;
    if new.status = 'graded' then
      new.status := 'submitted';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_submission_insert on submissions;
create trigger trg_guard_submission_insert
  before insert on submissions
  for each row execute function public.guard_submission_insert();

-- (c) articles: any 'teacher' row could publish, including pending/rejected
--     applicants, and could seed likes_count with any number.
drop policy if exists articles_insert_teacher on articles;
create policy articles_insert_teacher on articles
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'teacher' and p.status = 'active')
  );

create or replace function public.guard_article_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_verified_owner() then
    new.likes_count := 0;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_article_insert on articles;
create trigger trg_guard_article_insert
  before insert on articles
  for each row execute function public.guard_article_insert();

-- (d) course_ratings: any student could rate any course, enrolled or not.
drop policy if exists course_ratings_upsert_self on course_ratings;
create policy course_ratings_upsert_self on course_ratings
  for insert to authenticated
  with check (student_id = auth.uid() and public.current_role() = 'student' and public.is_enrolled(course_id));
-- After running this, review who holds the owner role (should be only your admins):
--   select p.id, p.name, p.username, u.email, p.is_temp_admin, p.created_at
--   from profiles p join auth.users u on u.id = p.id
--   where p.role = 'owner' order by p.created_at;
