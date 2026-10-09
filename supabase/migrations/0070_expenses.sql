-- 0070: business expenses (entered by the owner) for the Profit & Loss page.
-- Revenue is computed automatically from payments / invoices; expenses are
-- recorded here by hand. Owner-only.
-- Idempotent: safe to re-run.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  category text not null default 'other'
    check (category in ('salaries', 'teacher_fees', 'rent', 'marketing', 'software', 'government', 'equipment', 'other')),
  description text not null,
  amount_cents int not null check (amount_cents > 0),
  method text not null default 'bank' check (method in ('bank', 'cash', 'card')),
  note text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists expenses_spent_on_idx on public.expenses (spent_on desc);

alter table public.expenses enable row level security;

drop policy if exists expenses_owner_all on public.expenses;
create policy expenses_owner_all on public.expenses
  for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

-- Check
select count(*) as expenses_rows from public.expenses;
