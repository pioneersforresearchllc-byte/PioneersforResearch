-- Base table privileges the earlier migrations never granted. RLS policies
-- only filter rows once a role already has the underlying GRANT — without
-- this, every role (including service_role, which bypasses RLS but not
-- GRANTs) hits "permission denied for table X" on every query.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;
grant select on all tables in schema public to anon;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public
  grant select on tables to anon;

grant usage, select on all sequences in schema public to authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
