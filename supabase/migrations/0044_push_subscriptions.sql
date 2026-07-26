-- Web Push subscriptions: one row per browser/device a user has enabled
-- notifications on. The send-push edge function reads these with the service
-- role and delivers notifications; users only ever see/manage their own.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

-- Each user manages only their own subscriptions. (send-push uses the service
-- role, which bypasses RLS, to read every target's subscriptions.)
drop policy if exists push_subscriptions_select on push_subscriptions;
create policy push_subscriptions_select on push_subscriptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists push_subscriptions_insert on push_subscriptions;
create policy push_subscriptions_insert on push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

-- Needed so the client's upsert(onConflict: endpoint) can rebind a shared
-- device's endpoint to the currently signed-in user.
drop policy if exists push_subscriptions_update on push_subscriptions;
create policy push_subscriptions_update on push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists push_subscriptions_delete on push_subscriptions;
create policy push_subscriptions_delete on push_subscriptions
  for delete to authenticated using (user_id = auth.uid());
