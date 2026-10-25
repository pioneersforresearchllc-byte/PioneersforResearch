-- 0088: Private live workshops. A workshop flagged is_private is visible only
-- to the people the owner invites (plus its host and verified owners). Invited
-- people are registered directly — no self-reservation — and get a bell
-- notification. Nobody else can see it, reserve a seat in it, or obtain a call
-- token for it (create-group-call-token already requires a signup row).
-- Public workshops behave exactly as before.
-- Idempotent: safe to re-run.

alter table group_sessions add column if not exists is_private boolean not null default false;

-- Visibility: public workshops for every account; private ones only for the
-- invited (signup row), the host and verified owners.
drop policy if exists group_sessions_select on group_sessions;
create policy group_sessions_select on group_sessions
  for select to authenticated
  using (
    not is_private
    or public.is_verified_owner()
    or host_id = auth.uid()
    or exists (
      select 1 from group_session_signups s
      where s.session_id = group_sessions.id and s.user_id = auth.uid()
    )
  );

-- Self-reservation: unchanged for public workshops; refused for private ones
-- (reported as 'missing' so a private workshop's existence isn't confirmed).
create or replace function public.signup_group_session(p_session uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_status text; v_cap int; v_count int; v_private boolean;
begin
  select status, capacity, is_private into v_status, v_cap, v_private
  from group_sessions where id = p_session for update;
  if not found then return 'missing'; end if;
  if exists (select 1 from group_session_signups where session_id = p_session and user_id = auth.uid()) then
    return 'already';
  end if;
  if v_private then return 'missing'; end if;
  if v_status not in ('scheduled', 'live') then return 'closed'; end if;
  select count(*) into v_count from group_session_signups where session_id = p_session;
  if v_count >= v_cap then return 'full'; end if;
  insert into group_session_signups (session_id, user_id) values (p_session, auth.uid());
  return 'ok';
end; $$;
grant execute on function public.signup_group_session(uuid) to authenticated;

-- Invitees can't drop themselves from a private workshop (they couldn't
-- re-join); the owner manages that roster.
create or replace function public.cancel_group_signup(p_session uuid)
returns void language sql security definer set search_path = public as $$
  delete from group_session_signups s
  using group_sessions g
  where s.session_id = p_session and s.user_id = auth.uid()
    and g.id = s.session_id and not g.is_private;
$$;
grant execute on function public.cancel_group_signup(uuid) to authenticated;

-- Owner: invite people (registers them, raises capacity to fit, notifies the
-- newly invited). Returns how many were newly added.
create or replace function public.invite_to_group_session(p_session uuid, p_users uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_when timestamptz;
  v_added int;
begin
  if not public.is_verified_owner() then
    raise exception 'owner only';
  end if;
  select title, scheduled_at into v_title, v_when from group_sessions where id = p_session;
  if not found then raise exception 'workshop not found'; end if;

  with ins as (
    insert into group_session_signups (session_id, user_id)
    select p_session, u from unnest(p_users) as u
    where exists (select 1 from profiles p where p.id = u)
    on conflict (session_id, user_id) do nothing
    returning user_id
  ), notified as (
    insert into notifications (user_id, kind, title, body, url)
    select ins.user_id, 'workshop_invite',
           'دعوة لورشة مباشرة: ' || v_title,
           'الموعد: ' || to_char(v_when at time zone 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI') || ' (بتوقيت السعودية)',
           case when p.role = 'teacher' then '/teacher/workshops' else '/student/workshops' end
    from ins join profiles p on p.id = ins.user_id
    returning 1
  )
  select count(*) into v_added from ins;

  update group_sessions g
  set capacity = greatest(g.capacity, (select count(*) from group_session_signups s where s.session_id = g.id))
  where g.id = p_session;

  return v_added;
end; $$;
revoke all on function public.invite_to_group_session(uuid, uuid[]) from public, anon;
grant execute on function public.invite_to_group_session(uuid, uuid[]) to authenticated;

-- Check
select 'is_private column' as object, count(*) from information_schema.columns
  where table_name = 'group_sessions' and column_name = 'is_private'
union all
select 'invite_to_group_session', count(*) from pg_proc where proname = 'invite_to_group_session';
