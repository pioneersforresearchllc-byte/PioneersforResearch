-- Group live workshops ("الورش المباشرة"): account-holders-only interactive
-- video rooms that replace Zoom. A verified owner creates a workshop; any
-- logged-in account holder can browse it and reserve a seat (capped by
-- capacity). The chosen host (owner, or a teacher named as host_id) joins with
-- host privileges; everyone else lands in a host-admitted waiting room (Daily
-- "knocking") until let in. seats_taken is kept live by a trigger so the seat
-- counter can render without exposing the roster.

create table if not exists group_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  duration_min int not null default 60,
  capacity int not null default 15,
  seats_taken int not null default 0,
  host_id uuid references profiles(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended', 'cancelled')),
  daily_room_name text,
  daily_room_url text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists group_sessions_when_idx on group_sessions(scheduled_at);
alter table group_sessions enable row level security;

-- Any logged-in account holder may browse workshops (anon may not); only a
-- verified owner may create / edit / cancel them.
drop policy if exists group_sessions_select on group_sessions;
create policy group_sessions_select on group_sessions
  for select to authenticated using (true);
drop policy if exists group_sessions_write on group_sessions;
create policy group_sessions_write on group_sessions
  for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

create table if not exists group_session_signups (
  session_id uuid not null references group_sessions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  registered_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key (session_id, user_id)
);
create index if not exists group_signups_user_idx on group_session_signups(user_id);
alter table group_session_signups enable row level security;

-- A user sees only their own reservation; the owner sees the whole roster.
drop policy if exists group_signups_select on group_session_signups;
create policy group_signups_select on group_session_signups
  for select to authenticated
  using (user_id = auth.uid() or public.is_verified_owner());
-- Direct writes are owner-only (manual roster edits). Users reserve / cancel
-- through the capacity-safe functions below, which run as definer.
drop policy if exists group_signups_write on group_session_signups;
create policy group_signups_write on group_session_signups
  for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

-- Keep group_sessions.seats_taken in sync with the roster so the seat counter
-- is readable by everyone without reading other people's signup rows.
create or replace function public.trg_group_seats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update group_sessions set seats_taken = seats_taken + 1 where id = new.session_id;
  elsif tg_op = 'DELETE' then
    update group_sessions set seats_taken = greatest(0, seats_taken - 1) where id = old.session_id;
  end if;
  return null;
end; $$;
drop trigger if exists group_seats_aiud on group_session_signups;
create trigger group_seats_aiud after insert or delete on group_session_signups
  for each row execute function public.trg_group_seats();

-- Reserve a seat. Locks the workshop row so concurrent reservations can't
-- overshoot capacity. Returns 'ok' | 'already' | 'full' | 'closed' | 'missing'.
create or replace function public.signup_group_session(p_session uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_status text; v_cap int; v_count int;
begin
  select status, capacity into v_status, v_cap from group_sessions where id = p_session for update;
  if not found then return 'missing'; end if;
  if v_status not in ('scheduled', 'live') then return 'closed'; end if;
  if exists (select 1 from group_session_signups where session_id = p_session and user_id = auth.uid()) then
    return 'already';
  end if;
  select count(*) into v_count from group_session_signups where session_id = p_session;
  if v_count >= v_cap then return 'full'; end if;
  insert into group_session_signups (session_id, user_id) values (p_session, auth.uid());
  return 'ok';
end; $$;
grant execute on function public.signup_group_session(uuid) to authenticated;

create or replace function public.cancel_group_signup(p_session uuid)
returns void language sql security definer set search_path = public as $$
  delete from group_session_signups where session_id = p_session and user_id = auth.uid();
$$;
grant execute on function public.cancel_group_signup(uuid) to authenticated;

grant select, insert, update, delete on group_sessions, group_session_signups to authenticated;
