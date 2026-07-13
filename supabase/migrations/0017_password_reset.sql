-- "Forgot password" OTP flow. user_id references auth.users directly since
-- this runs for a logged-out visitor (no profiles-scoped session yet).
create table password_reset_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  attempts int not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- Intentionally no policies — only the service role (Edge Functions) may
-- touch this table, mirroring admin_login_otps / signup_otps.
alter table password_reset_otps enable row level security;
