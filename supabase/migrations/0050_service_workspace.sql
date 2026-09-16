-- Service workspace: once a service request is paid / in progress, the assigned
-- teacher schedules live sessions and posts tasks for the student, and the
-- student sees them in "My Services". Two small tables scoped to a request,
-- plus access-helper functions used by their RLS.

-- Can the caller SEE this request's workspace? Its student, its assigned
-- teacher, or a verified owner.
create or replace function public.can_access_request(p_request uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from service_requests r
    where r.id = p_request
      and (r.user_id = auth.uid() or r.assigned_teacher_id = auth.uid() or public.is_verified_owner())
  );
$$;
grant execute on function public.can_access_request(uuid) to authenticated;

-- Can the caller MANAGE (add/edit/delete) this request's workspace? Its
-- assigned teacher, or a verified owner.
create or replace function public.can_manage_request(p_request uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from service_requests r
    where r.id = p_request
      and (r.assigned_teacher_id = auth.uid() or public.is_verified_owner())
  );
$$;
grant execute on function public.can_manage_request(uuid) to authenticated;

-- ── Sessions (schedule + join links) ─────────────────────────────────────
create table if not exists service_sessions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  title text not null,
  session_date date,
  session_time time,
  link text,
  created_at timestamptz not null default now()
);
create index if not exists service_sessions_request_idx on service_sessions(request_id, session_date);
alter table service_sessions enable row level security;

drop policy if exists service_sessions_select on service_sessions;
create policy service_sessions_select on service_sessions
  for select to authenticated using (public.can_access_request(request_id));

drop policy if exists service_sessions_write on service_sessions;
create policy service_sessions_write on service_sessions
  for all to authenticated
  using (public.can_manage_request(request_id)) with check (public.can_manage_request(request_id));

-- ── Tasks (assignments the teacher posts) ────────────────────────────────
create table if not exists service_tasks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  link text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists service_tasks_request_idx on service_tasks(request_id, created_at);
alter table service_tasks enable row level security;

drop policy if exists service_tasks_select on service_tasks;
create policy service_tasks_select on service_tasks
  for select to authenticated using (public.can_access_request(request_id));

-- Only the manager (teacher/owner) may create/edit/delete tasks.
drop policy if exists service_tasks_write on service_tasks;
create policy service_tasks_write on service_tasks
  for all to authenticated
  using (public.can_manage_request(request_id)) with check (public.can_manage_request(request_id));

-- The student marks a task done through this function (which touches ONLY the
-- `done` column), so they can't edit the task's content.
create or replace function public.set_service_task_done(p_task uuid, p_done boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update service_tasks tsk set done = p_done
  where tsk.id = p_task
    and exists (select 1 from service_requests r where r.id = tsk.request_id and r.user_id = auth.uid());
end; $$;
grant execute on function public.set_service_task_done(uuid, boolean) to authenticated;

grant select, insert, update, delete on service_sessions, service_tasks to authenticated;
