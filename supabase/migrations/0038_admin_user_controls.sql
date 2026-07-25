-- Admin controls over people: temporarily disable (suspend), ban from specific
-- capabilities (restrictions[]), or delete accounts; plus manual enroll/unenroll
-- (done through the admin-user-actions edge function with the service role).
--
-- Enforcement here is real (RLS), not just UI. Suspension is primarily enforced
-- at login, and these RESTRICTIVE policies are a hard backstop on the main write
-- surfaces. Restrictive policies AND with the existing permissive ones, so we
-- add them WITHOUT touching (and risking) the current policies.

alter table profiles add column if not exists suspended boolean not null default false;
alter table profiles add column if not exists restrictions text[] not null default '{}';

-- Is the CURRENT user suspended / banned from a given capability?
create or replace function public.is_suspended()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select suspended from profiles where id = auth.uid()), false);
$$;

create or replace function public.has_restriction(cap text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select cap = any(restrictions) from profiles where id = auth.uid()), false);
$$;

-- A user may edit their own profile (name, bio…), but must NOT be able to lift
-- their own suspension/restrictions. Only the service role (admin edge function)
-- or a verified owner may change those two columns; anyone else's attempt is
-- silently reverted to the stored values.
create or replace function public.guard_profile_privileged_cols()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.suspended is distinct from old.suspended
      or new.restrictions is distinct from old.restrictions) then
    if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' and not public.is_verified_owner() then
      new.suspended := old.suspended;
      new.restrictions := old.restrictions;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_profile_privileged on profiles;
create trigger trg_guard_profile_privileged
  before update on profiles
  for each row execute function public.guard_profile_privileged_cols();

-- ── Restrictive write backstops (added, not replacing existing policies) ────
drop policy if exists messages_not_restricted on messages;
create policy messages_not_restricted on messages
  as restrictive for insert to authenticated
  with check (not public.is_suspended() and not public.has_restriction('chat'));

drop policy if exists service_requests_not_restricted on service_requests;
create policy service_requests_not_restricted on service_requests
  as restrictive for insert to authenticated
  with check (not public.is_suspended() and not public.has_restriction('requests'));

drop policy if exists article_comments_not_restricted on article_comments;
create policy article_comments_not_restricted on article_comments
  as restrictive for insert to authenticated
  with check (not public.is_suspended() and not public.has_restriction('comments'));

drop policy if exists submission_messages_not_restricted on submission_messages;
create policy submission_messages_not_restricted on submission_messages
  as restrictive for insert to authenticated
  with check (not public.is_suspended() and not public.has_restriction('submissions'));
