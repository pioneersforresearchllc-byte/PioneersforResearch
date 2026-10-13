-- Service requests: the real-world money flow.
--   new → negotiating → awaiting_deposit → in_progress → awaiting_final → done
-- The owner records an agreed price, issues a deposit invoice (default 50%)
-- and later a final invoice for the remainder. Both are ordinary
-- student_invoices (bank transfer + receipt), now linked to the request, so
-- confirming the receipt advances the request automatically.
-- Final deliverables live under "<request_id>/final/..." in the service-files
-- bucket; the student can download them only once the request is fully paid
-- (or the owner unlocks them by hand).
-- Safe to run more than once.

-- ── (1) New stages + money columns ──────────────────────────────────────
alter table service_requests drop constraint if exists service_requests_status_check;
alter table service_requests add constraint service_requests_status_check
  check (status in ('pending', 'negotiating', 'awaiting_deposit', 'awaiting_payment', 'paid',
                    'in_progress', 'awaiting_final', 'done', 'cancelled'));

alter table service_requests add column if not exists agreed_price_cents int check (agreed_price_cents is null or agreed_price_cents >= 0);
alter table service_requests add column if not exists deposit_percent int not null default 50 check (deposit_percent between 0 and 100);
alter table service_requests add column if not exists owner_note text;
alter table service_requests add column if not exists deliverables_unlocked boolean not null default false;

-- Only a verified owner may write the money / lock columns. The assigned
-- teacher keeps their existing update right (status), nothing more.
create or replace function public.guard_service_request_money()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_verified_owner() and auth.role() <> 'service_role' then
    new.agreed_price_cents := old.agreed_price_cents;
    new.deposit_percent := old.deposit_percent;
    new.owner_note := old.owner_note;
    new.deliverables_unlocked := old.deliverables_unlocked;
    new.final_price_cents := old.final_price_cents;
  end if;
  return new;
end; $$;
drop trigger if exists service_requests_guard_money on service_requests;
create trigger service_requests_guard_money
  before update on service_requests
  for each row execute function public.guard_service_request_money();

-- Non-owner inserts can't pre-set money / unlock (extends 0059's guard).
create or replace function public.guard_service_request_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_verified_owner() then
    new.status := 'pending';
    new.final_price_cents := null;
    new.assigned_teacher_id := null;
    new.agreed_price_cents := null;
    new.deliverables_unlocked := false;
    new.owner_note := null;
  end if;
  return new;
end; $$;

-- The assigned teacher may also work the request while the final payment is due.
drop policy if exists service_requests_update_assignee on service_requests;
create policy service_requests_update_assignee on service_requests
  for update to authenticated
  using (assigned_teacher_id = auth.uid() and status in ('paid', 'in_progress', 'awaiting_final'))
  with check (assigned_teacher_id = auth.uid() and status in ('paid', 'in_progress', 'awaiting_final', 'done'));

-- ── (2) Invoices linked to a request ────────────────────────────────────
alter table student_invoices add column if not exists service_request_id uuid references service_requests(id) on delete set null;
alter table student_invoices add column if not exists kind text not null default 'other';
alter table student_invoices drop constraint if exists student_invoices_kind_check;
alter table student_invoices add constraint student_invoices_kind_check check (kind in ('deposit', 'final', 'other'));
create index if not exists student_invoices_request_idx on student_invoices(service_request_id);

-- Paid so far on a request (confirmed invoices only).
create or replace function public.request_paid_cents(p_request uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount_cents), 0)::int from student_invoices
  where service_request_id = p_request and status = 'paid';
$$;
grant execute on function public.request_paid_cents(uuid) to authenticated;

-- Fully paid (or unlocked by the owner) → final files may be downloaded.
create or replace function public.request_is_settled(p_request uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from service_requests r
    where r.id = p_request
      and (r.deliverables_unlocked
           or (r.agreed_price_cents is not null and public.request_paid_cents(r.id) >= r.agreed_price_cents))
  );
$$;
grant execute on function public.request_is_settled(uuid) to authenticated;

-- Owner issues the deposit / final invoice for a request; the request moves to
-- the matching "awaiting" stage. Returns the new invoice id.
create or replace function public.admin_create_request_invoice(
  p_request uuid, p_kind text, p_amount_cents int
) returns uuid language plpgsql security definer set search_path = public as $$
declare r service_requests%rowtype; v_title text; v_service text; v_id uuid;
begin
  if not public.is_verified_owner() then raise exception 'not authorized'; end if;
  if p_kind not in ('deposit', 'final') then raise exception 'bad kind'; end if;
  if coalesce(p_amount_cents, 0) <= 0 then raise exception 'amount must be positive'; end if;
  select * into r from service_requests where id = p_request;
  if not found then raise exception 'request not found'; end if;
  if r.user_id is null then raise exception 'request has no student account'; end if;
  select title into v_service from services where id = r.service_id;
  v_title := (case when p_kind = 'deposit' then 'دفعة مقدمة — ' else 'الدفعة النهائية — ' end)
             || coalesce(nullif(v_service, ''), nullif(r.subject, ''), 'خدمة');
  insert into student_invoices (user_id, title, description, amount_cents, created_by, service_request_id, kind)
  values (r.user_id, v_title, nullif(r.subject, ''), p_amount_cents, auth.uid(), p_request, p_kind)
  returning id into v_id;
  update service_requests
    set status = case when p_kind = 'deposit' then 'awaiting_deposit' else 'awaiting_final' end
  where id = p_request;
  return v_id;
end; $$;
grant execute on function public.admin_create_request_invoice(uuid, text, int) to authenticated;

-- Confirming a linked invoice moves the request forward on its own.
create or replace function public.advance_request_on_invoice_paid()
returns trigger language plpgsql security definer set search_path = public as $$
declare r service_requests%rowtype;
begin
  if new.service_request_id is null or new.status <> 'paid' or old.status = 'paid' then return new; end if;
  select * into r from service_requests where id = new.service_request_id;
  if not found then return new; end if;
  if new.kind = 'deposit' and r.status in ('pending', 'negotiating', 'awaiting_deposit', 'awaiting_payment') then
    update service_requests set status = 'in_progress' where id = r.id;
  elsif new.kind = 'final' and r.status in ('awaiting_final', 'in_progress', 'paid')
        and r.agreed_price_cents is not null
        and public.request_paid_cents(r.id) >= r.agreed_price_cents then
    update service_requests set status = 'done' where id = r.id;
  end if;
  return new;
end; $$;
drop trigger if exists student_invoices_advance_request on student_invoices;
create trigger student_invoices_advance_request
  after update of status on student_invoices
  for each row execute function public.advance_request_on_invoice_paid();

-- ── (3) Final deliverables (names visible, download gated) ──────────────
create table if not exists service_deliverables (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  path text not null,            -- "<request_id>/final/<uuid>.<ext>" in service-files
  file_name text not null,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists service_deliverables_request_idx on service_deliverables(request_id, created_at desc);
alter table service_deliverables enable row level security;

drop policy if exists service_deliverables_select on service_deliverables;
create policy service_deliverables_select on service_deliverables
  for select to authenticated using (public.can_access_request(request_id));
drop policy if exists service_deliverables_insert on service_deliverables;
create policy service_deliverables_insert on service_deliverables
  for insert to authenticated with check (public.can_manage_request(request_id));
drop policy if exists service_deliverables_delete on service_deliverables;
create policy service_deliverables_delete on service_deliverables
  for delete to authenticated using (public.can_manage_request(request_id));
grant select, insert, delete on service_deliverables to authenticated;

-- Storage: anything under "<request_id>/final/" is readable by the student
-- only once the request is settled; staff always.
create or replace function public.can_access_service_file(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare rid uuid; parts text[];
begin
  parts := storage.foldername(p_name);
  begin rid := parts[1]::uuid; exception when others then return false; end;
  if not public.can_access_request(rid) then return false; end if;
  if coalesce(parts[2], '') = 'final' and not public.can_manage_request(rid) then
    return public.request_is_settled(rid);
  end if;
  return true;
end; $$;

-- The student must not upload into the final folder.
drop policy if exists service_files_insert on storage.objects;
create policy service_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'service-files'
    and public.can_access_service_file(name)
    and (coalesce((storage.foldername(name))[2], '') <> 'final'
         or public.can_manage_service_file(name))
  );

-- ── (4) Tidy the finance ledger ─────────────────────────────────────────
-- Paying an invoice also wrote a mirror row into manual_payments
-- (note 'invoice:<id>'). Remove mirrors whose invoice no longer exists
-- (e.g. the deleted TEST invoices).
delete from manual_payments m
where m.note like 'invoice:%'
  and not exists (select 1 from student_invoices i where 'invoice:' || i.id::text = m.note);
