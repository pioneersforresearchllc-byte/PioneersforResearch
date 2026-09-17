-- Service workspace, round 2:
--   (1) A per-service chat thread between the assigned teacher and the student.
--   (2) Persistent in-site notifications (a bell in the dashboard) — populated
--       server-side by the send-push and session-reminders edge functions.
--   (3) A `reminder_sent_at` marker on sessions so the 15-minutes-before email/
--       notification is sent exactly once per session.

-- ── (1) Per-service chat ─────────────────────────────────────────────────
-- Scoped to a service_request; visibility reuses the existing access helper
-- (student who owns the request, its assigned teacher, or a verified owner).
create table if not exists service_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  text text,
  attachment_url text,
  attachment_kind text,
  attachment_name text,
  created_at timestamptz not null default now()
);
create index if not exists service_messages_request_idx on service_messages(request_id, created_at);
alter table service_messages enable row level security;

drop policy if exists service_messages_select on service_messages;
create policy service_messages_select on service_messages
  for select to authenticated using (public.can_access_request(request_id));

-- Anyone who can access the workspace (student or its teacher/owner) may post,
-- but only as themselves.
drop policy if exists service_messages_insert on service_messages;
create policy service_messages_insert on service_messages
  for insert to authenticated
  with check (public.can_access_request(request_id) and sender_id = auth.uid());

-- Sender may soft-edit/delete their own message (kept simple: full row control
-- limited to author).
drop policy if exists service_messages_update on service_messages;
create policy service_messages_update on service_messages
  for update to authenticated using (sender_id = auth.uid()) with check (sender_id = auth.uid());

grant select, insert, update on service_messages to authenticated;

-- ── (2) In-site notifications ────────────────────────────────────────────
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null default 'general',
  title text not null,
  body text,
  url text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications(user_id, created_at desc);
alter table notifications enable row level security;

-- A user only ever sees / touches their own notifications. Rows are created
-- server-side (service role), so there is deliberately no INSERT policy for
-- authenticated users.
drop policy if exists notifications_select on notifications;
create policy notifications_select on notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists notifications_update on notifications;
create policy notifications_update on notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_delete on notifications;
create policy notifications_delete on notifications
  for delete to authenticated using (user_id = auth.uid());

grant select, update, delete on notifications to authenticated;

-- Mark all of the caller's notifications read in one shot (bell "mark all").
create or replace function public.mark_notifications_read()
returns void language sql security definer set search_path = public as $$
  update notifications set read = true where user_id = auth.uid() and read = false;
$$;
grant execute on function public.mark_notifications_read() to authenticated;

-- ── (3) Session reminder marker ──────────────────────────────────────────
alter table service_sessions add column if not exists reminder_sent_at timestamptz;

-- ── Realtime ─────────────────────────────────────────────────────────────
-- Live chat + live bell. Guarded so re-running the migration never errors if
-- the table is already in the publication.
do $$
begin
  begin
    alter publication supabase_realtime add table service_messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table notifications;
  exception when duplicate_object then null;
  end;
end $$;
