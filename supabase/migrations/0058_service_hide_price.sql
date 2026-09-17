-- Let the owner hide the price of a specific service (shown as "price on
-- request" on the card and detail page). Owner-only writes are already covered
-- by the existing services_write_owner policy.
alter table services add column if not exists hide_price boolean not null default false;
