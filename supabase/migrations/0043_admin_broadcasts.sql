-- Admin broadcast emails: the owner composes a subject + message and picks an
-- audience (students / teachers / everyone). The admin-broadcast edge function
-- (service role) fans it out over SMTP and records one row here per send, so
-- the Broadcast tab can show a history of what was sent and to how many people.

create table if not exists admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id) on delete set null,
  audience text not null check (audience in ('students', 'teachers', 'all')),
  subject text not null,
  message text not null,
  recipient_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists admin_broadcasts_created_idx on admin_broadcasts(created_at desc);

alter table admin_broadcasts enable row level security;

-- Only a verified owner can read the history. Rows are inserted by the
-- admin-broadcast edge function with the service role (which bypasses RLS),
-- so there is deliberately no insert policy here.
drop policy if exists admin_broadcasts_select on admin_broadcasts;
create policy admin_broadcasts_select on admin_broadcasts
  for select to authenticated
  using (public.is_verified_owner());
