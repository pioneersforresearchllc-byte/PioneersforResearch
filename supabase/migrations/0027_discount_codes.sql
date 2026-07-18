-- Promo / discount codes. The owner creates a code with a percentage off,
-- targets it at one existing course OR one service, optionally bounds it with
-- start/end dates, and can deactivate or delete it. Codes are validated and
-- applied server-side by the Stripe checkout Edge Functions (service role),
-- never trusted from the client.
--
-- Written idempotently so a partially-applied run can simply be re-run.

create table if not exists discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent_off int not null check (percent_off between 1 and 100),
  course_id uuid references courses (id) on delete cascade,
  service_id uuid references services (id) on delete cascade,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint discount_target_check check (course_id is not null or service_id is not null)
);

create index if not exists discount_codes_code_idx on discount_codes (lower(code));

alter table discount_codes enable row level security;

-- Only a verified owner can read or manage codes from the client. The checkout
-- functions use the service-role key, which bypasses RLS, so customers never
-- need direct read access.
drop policy if exists discount_codes_owner on discount_codes;
create policy discount_codes_owner on discount_codes
  for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

grant select, insert, update, delete on discount_codes to authenticated;
