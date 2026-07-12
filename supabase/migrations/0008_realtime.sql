-- Enable Postgres realtime broadcasts for the messaging tables the chat UI
-- subscribes to (supabase.channel(...).on('postgres_changes', ...)) — a
-- table not in this publication never fires change events, so the other
-- participant's message list / unread badge would only ever update on a
-- manual reload.
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversation_members;
alter publication supabase_realtime add table conversations;
