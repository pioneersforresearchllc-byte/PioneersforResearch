-- A service can now be sold WITHOUT packages: it carries its own price (and an
-- optional original price for a struck-through "was" figure) used on the card
-- and detail page when the service has no packages. Owner-only writes are
-- already covered by the existing services_write_owner policy.
alter table services add column if not exists price_cents int;
alter table services add column if not exists original_price_cents int;
