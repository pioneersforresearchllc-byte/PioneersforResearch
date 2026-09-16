-- Direct discount (no code) on a service package: an optional "old" price that
-- shows struck-through next to the current price, so the owner can run a sale
-- without issuing a discount code. When set above the current price, the UI
-- renders it crossed out.

alter table service_packages add column if not exists original_price_cents int;
