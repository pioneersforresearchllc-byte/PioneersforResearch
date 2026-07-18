-- Two eligibility rules for discount codes:
--   new_users_only      — only accounts registered within the last 30 days.
--   first_purchase_only — only customers who have no completed payment yet.
-- Both are enforced server-side (validate-discount + the checkout functions).
--
-- Written idempotently so a partially-applied run can simply be re-run.

alter table discount_codes add column if not exists new_users_only boolean not null default false;
alter table discount_codes add column if not exists first_purchase_only boolean not null default false;
