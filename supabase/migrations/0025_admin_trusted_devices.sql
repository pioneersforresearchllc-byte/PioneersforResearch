-- Cut down owner-login OTP emails: instead of one every login, only send when
-- the owner signs in from a device we've never seen verified, or when the last
-- verification on this device is older than 48 hours. A device that verified an
-- OTP within the last 48h is "trusted" and its next logins skip the email.
--
-- Password is still required on every login — this only governs the second
-- factor (the emailed code), a standard "remember this device for 48h" model.
--
-- Written idempotently so a partially-applied run can simply be re-run.

-- One row per (owner, browser). device_hash is sha256 of a random token the
-- browser keeps in localStorage; last_verified_at is the last time a real OTP
-- was verified on it (NOT bumped on skips, so the 48h cadence actually elapses).
create table if not exists admin_trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  device_hash text not null,
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_hash)
);

-- Reached only through the send-otp / verify-otp Edge Functions (service-role,
-- which bypasses RLS). Enable RLS with no policies so no client can read or
-- forge trust records directly.
alter table admin_trusted_devices enable row level security;

-- The OTP re-auth window governs how long owner DB access stays unlocked after
-- a verification. Widen it from 12h to 48h so it matches the device-trust
-- cadence: a trusted-device login (which auto-writes a fresh verified row)
-- keeps access valid for the same 48h before another OTP is needed.
create or replace function public.is_verified_owner()
returns boolean
language sql stable security definer set search_path = public as $$
  select
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
    and exists (
      select 1 from admin_login_otps
      where user_id = auth.uid()
        and consumed = true
        and verified_at > now() - interval '48 hours'
    );
$$;
grant execute on function public.is_verified_owner() to authenticated;
