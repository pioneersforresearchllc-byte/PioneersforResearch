-- Institutions track. An institution account is a profile with role
-- 'institution' (status 'pending' until an admin verifies it, reusing the same
-- flow as teacher applications). The organisation's details, its team members,
-- its consultation requests, and its invoices live in the tables below.
--
-- Run AFTER 0033 (which adds the 'institution' enum value). Written
-- idempotently so a partially-applied run can simply be re-run.

create table if not exists institutions (
  id uuid primary key default gen_random_uuid(),
  primary_contact_user_id uuid references profiles (id) on delete set null,
  name text not null,
  org_type text,
  registration_number text,
  country text,
  city text,
  contact_name text,
  contact_title text,
  contact_email text,
  contact_phone text,
  consultation_type text,
  size text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists institutions_contact_idx on institutions (primary_contact_user_id);

create table if not exists institution_members (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  member_role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (institution_id, user_id)
);

create table if not exists institution_consultations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions (id) on delete cascade,
  created_by uuid references profiles (id) on delete set null,
  title text not null,
  description text,
  consultation_type text,
  budget_estimate text,
  timeline text,
  attachment_url text,
  final_price_cents int,
  status text not null default 'pending'
    check (status in ('pending', 'awaiting_payment', 'in_progress', 'done', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists inst_consult_inst_idx on institution_consultations (institution_id);

create table if not exists institution_invoices (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions (id) on delete cascade,
  consultation_id uuid references institution_consultations (id) on delete set null,
  amount_cents int not null,
  method text not null default 'bank' check (method in ('stripe', 'bank')),
  status text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  file_url text,
  created_at timestamptz not null default now()
);
create index if not exists inst_invoice_inst_idx on institution_invoices (institution_id);

-- The institution the current user belongs to (as primary contact or team
-- member). Used by RLS so every institution row is scoped to its own people.
create or replace function public.current_institution_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select id from institutions where primary_contact_user_id = auth.uid() limit 1),
    (select institution_id from institution_members where user_id = auth.uid() limit 1)
  );
$$;
grant execute on function public.current_institution_id() to authenticated;

alter table institutions enable row level security;
alter table institution_members enable row level security;
alter table institution_consultations enable row level security;
alter table institution_invoices enable row level security;

drop policy if exists institutions_select on institutions;
create policy institutions_select on institutions
  for select to authenticated
  using (id = public.current_institution_id() or public.is_verified_owner());
drop policy if exists institutions_write_owner on institutions;
create policy institutions_write_owner on institutions
  for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

drop policy if exists inst_members_select on institution_members;
create policy inst_members_select on institution_members
  for select to authenticated
  using (institution_id = public.current_institution_id() or public.is_verified_owner());
drop policy if exists inst_members_write_owner on institution_members;
create policy inst_members_write_owner on institution_members
  for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

drop policy if exists inst_consult_select on institution_consultations;
create policy inst_consult_select on institution_consultations
  for select to authenticated
  using (institution_id = public.current_institution_id() or public.is_verified_owner());
drop policy if exists inst_consult_insert on institution_consultations;
create policy inst_consult_insert on institution_consultations
  for insert to authenticated
  with check (institution_id = public.current_institution_id());
drop policy if exists inst_consult_write_owner on institution_consultations;
create policy inst_consult_write_owner on institution_consultations
  for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

drop policy if exists inst_invoice_select on institution_invoices;
create policy inst_invoice_select on institution_invoices
  for select to authenticated
  using (institution_id = public.current_institution_id() or public.is_verified_owner());
drop policy if exists inst_invoice_write_owner on institution_invoices;
create policy inst_invoice_write_owner on institution_invoices
  for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

grant select, insert, update, delete on institutions, institution_members, institution_consultations, institution_invoices to authenticated;
