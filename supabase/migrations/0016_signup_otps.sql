-- Email OTP gate for new registrations (student + teacher), to keep bots
-- from mass-creating accounts. user_id references auth.users directly
-- (not profiles) since at send-time the account has no profile yet — the
-- profile row is only created by create-profile AFTER the code is verified.
create table signup_otps (
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
-- touch this table, mirroring admin_login_otps.
alter table signup_otps enable row level security;
