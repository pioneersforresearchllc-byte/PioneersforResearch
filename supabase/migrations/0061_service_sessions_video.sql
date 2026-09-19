-- In-app live video sessions (Daily). A session can be an "in-app video call"
-- instead of an external link; the Daily room is created on first join and its
-- URL/name cached here (written by the create-call-token edge function via the
-- service role, so no extra client policy is needed).
alter table service_sessions add column if not exists is_video boolean not null default false;
alter table service_sessions add column if not exists daily_room_url text;
alter table service_sessions add column if not exists daily_room_name text;
