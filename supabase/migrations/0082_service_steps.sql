-- Per-request service journey ("سير الخدمة"): a student-facing roadmap the
-- assigned trainer (or owner) tailors per request. Each request is seeded with
-- default steps (no deposit step); the trainer can add, delete, reorder and
-- mark progress. The student sees it read-only.

create table if not exists service_steps (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  title text not null,
  position int not null default 0,
  state text not null default 'pending' check (state in ('pending', 'current', 'done')),
  created_at timestamptz not null default now()
);
create index if not exists service_steps_request_idx on service_steps(request_id, position);
alter table service_steps enable row level security;

-- Student of the request (and assigned trainer / owner) can see the steps;
-- only the manager (assigned trainer / verified owner) may add/edit/delete.
drop policy if exists service_steps_select on service_steps;
create policy service_steps_select on service_steps
  for select to authenticated using (public.can_access_request(request_id));

drop policy if exists service_steps_write on service_steps;
create policy service_steps_write on service_steps
  for all to authenticated
  using (public.can_manage_request(request_id)) with check (public.can_manage_request(request_id));

grant select, insert, update, delete on service_steps to authenticated;

-- Seed the default roadmap once per request (idempotent). Anyone who can see
-- the request may trigger the seed, so the student sees the base steps even
-- before the trainer customises them. No "deposit" step by design.
create or replace function public.seed_service_steps(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_access_request(p_request) then return; end if;
  if exists (select 1 from service_steps where request_id = p_request) then return; end if;
  insert into service_steps (request_id, title, position) values
    (p_request, 'استلام الطلب', 1),
    (p_request, 'التخطيط والاتفاق', 2),
    (p_request, 'قيد التنفيذ', 3),
    (p_request, 'المراجعة', 4),
    (p_request, 'الدفعة النهائية', 5),
    (p_request, 'التسليم', 6);
end; $$;
grant execute on function public.seed_service_steps(uuid) to authenticated;
