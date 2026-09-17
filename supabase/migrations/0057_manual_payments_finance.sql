-- Finance: let the owner record off-platform payments (cash / bank transfer for
-- a course or service) so the finance area is a complete revenue ledger that
-- can be printed as a statement for the commercial registrar / ZATCA. Also let
-- the owner delete payment rows (e.g. clearing test transactions).

create table if not exists manual_payments (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'other',            -- 'course' | 'service' | 'other'
  course_id uuid references courses(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  description text not null,                       -- what was paid for (label)
  payer_name text,                                 -- customer name (optional)
  amount_cents int not null check (amount_cents >= 0),
  method text not null default 'cash',             -- 'cash' | 'bank' | 'transfer'
  paid_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists manual_payments_paid_idx on manual_payments(paid_at desc);
alter table manual_payments enable row level security;

-- Owner-only ledger (verified owner). No one else can read or write it.
drop policy if exists manual_payments_all_owner on manual_payments;
create policy manual_payments_all_owner on manual_payments
  for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

grant select, insert, update, delete on manual_payments to authenticated;

-- Allow a verified owner to delete online payment rows too (removing erroneous
-- or test transactions from the ledger).
drop policy if exists payments_delete_owner on payments;
create policy payments_delete_owner on payments
  for delete to authenticated using (public.is_verified_owner());
grant delete on payments to authenticated;
