-- 0076: alert the owner when a customer hits an error in a critical flow
-- (signup verification code, etc.), so a broken step never goes unnoticed.
-- The browser inserts a row; a trigger asks notify-owner (migration 0068) to
-- alert every owner by email, push and the dashboard bell. notify-owner
-- throttles this source so a flood of errors can't flood the inbox.
-- Idempotent: safe to re-run.

create table if not exists public.site_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  area text not null check (char_length(area) between 1 and 60),
  detail text check (detail is null or char_length(detail) <= 500),
  email text check (email is null or char_length(email) <= 200),
  created_at timestamptz not null default now()
);
alter table public.site_errors enable row level security;

-- Anyone (even mid-signup) may report; nobody but the owner may read.
drop policy if exists site_errors_insert on public.site_errors;
create policy site_errors_insert on public.site_errors
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists site_errors_owner_read on public.site_errors;
create policy site_errors_owner_read on public.site_errors
  for select to authenticated
  using (public.is_verified_owner());

drop trigger if exists trg_alert_site_error on public.site_errors;
create trigger trg_alert_site_error
  after insert on public.site_errors
  for each row execute function public.notify_owner_alert('site_error');

-- Check: should return 1 row.
select trigger_name from information_schema.triggers where trigger_name = 'trg_alert_site_error';
