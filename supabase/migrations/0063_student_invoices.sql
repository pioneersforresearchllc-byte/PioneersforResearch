-- Standalone billing: after a service is finished, the owner issues a custom
-- invoice to a specific student (amount + description). The student sees it,
-- transfers the amount to the bank IBAN (shown from site_content 'bank.details'),
-- uploads the transfer receipt, and the owner confirms — which also mirrors the
-- payment into the manual_payments ledger so the finance statement stays whole.
-- This is intentionally separate from the service_requests pricing pipeline.

-- ── Receipt storage (private) ────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

-- Student uploads only into their own folder (uid/…); owner reads everything.
drop policy if exists payment_receipts_insert on storage.objects;
create policy payment_receipts_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists payment_receipts_update on storage.objects;
create policy payment_receipts_update on storage.objects for update to authenticated
  using (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists payment_receipts_select on storage.objects;
create policy payment_receipts_select on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-receipts'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_verified_owner())
  );

-- ── Invoices ─────────────────────────────────────────────────────────────
create table if not exists student_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,   -- the billed student
  title text not null,
  description text,
  amount_cents int not null check (amount_cents >= 0),
  status text not null default 'unpaid' check (status in ('unpaid', 'submitted', 'paid', 'cancelled')),
  receipt_path text,                 -- transfer receipt in payment-receipts bucket
  receipt_submitted_at timestamptz,
  paid_at timestamptz,
  note text,                         -- owner note
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists student_invoices_user_idx on student_invoices(user_id, created_at desc);
alter table student_invoices enable row level security;

-- The billed student reads their own invoices; the owner reads/writes all.
drop policy if exists student_invoices_select on student_invoices;
create policy student_invoices_select on student_invoices
  for select to authenticated
  using (user_id = auth.uid() or public.is_verified_owner());
drop policy if exists student_invoices_write_owner on student_invoices;
create policy student_invoices_write_owner on student_invoices
  for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

-- Owner issues an invoice to a student found by email or username.
-- Returns the new invoice id, or raises if the student isn't found.
create or replace function public.admin_create_invoice(
  p_identifier text, p_title text, p_description text, p_amount_cents int
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_id uuid;
begin
  if not public.is_verified_owner() then raise exception 'not authorized'; end if;
  select u.id into v_uid from auth.users u where lower(u.email) = lower(trim(p_identifier));
  if v_uid is null then
    select p.id into v_uid from profiles p where lower(p.username) = lower(trim(p_identifier));
  end if;
  if v_uid is null then raise exception 'student not found'; end if;
  insert into student_invoices (user_id, title, description, amount_cents, created_by)
  values (v_uid, p_title, nullif(trim(p_description), ''), greatest(0, p_amount_cents), auth.uid())
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.admin_create_invoice(text, text, text, int) to authenticated;

-- The student attaches a transfer receipt and marks the invoice submitted.
-- Restricted to their own unpaid/submitted invoice; can't touch amount/status
-- beyond this transition.
create or replace function public.submit_invoice_receipt(p_invoice uuid, p_path text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update student_invoices
    set receipt_path = p_path, receipt_submitted_at = now(), status = 'submitted'
  where id = p_invoice and user_id = auth.uid() and status in ('unpaid', 'submitted');
  if not found then raise exception 'invoice not payable'; end if;
end; $$;
grant execute on function public.submit_invoice_receipt(uuid, text) to authenticated;

-- Owner confirms payment: marks the invoice paid and records it in the
-- manual_payments ledger so it flows into the finance statement.
create or replace function public.admin_mark_invoice_paid(p_invoice uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_title text; v_amount int; v_name text;
begin
  if not public.is_verified_owner() then raise exception 'not authorized'; end if;
  update student_invoices set status = 'paid', paid_at = now()
    where id = p_invoice and status <> 'paid'
    returning user_id, title, amount_cents into v_uid, v_title, v_amount;
  if not found then return; end if;
  select name into v_name from profiles where id = v_uid;
  insert into manual_payments (kind, description, payer_name, amount_cents, method, paid_at, note)
  values ('other', v_title, v_name, v_amount, 'bank', current_date, 'invoice:' || p_invoice);
end; $$;
grant execute on function public.admin_mark_invoice_paid(uuid) to authenticated;

grant select, insert, update, delete on student_invoices to authenticated;
