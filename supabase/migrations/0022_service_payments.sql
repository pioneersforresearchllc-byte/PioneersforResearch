-- Payment stage for service requests. A service isn't a fixed-price product:
-- the package is what the customer *asked* for, but the real price is only
-- known once the team reads the brief (10 slides of content can turn out to
-- need 15). So the owner sets a final price, which is what the customer
-- actually pays via Stripe.

alter table service_requests add column final_price_cents int;

-- New stages between "new" and "in progress":
--   awaiting_payment — owner priced it and asked the customer to pay
--   paid             — Stripe confirmed payment (set only by the webhook)
alter table service_requests drop constraint service_requests_status_check;
alter table service_requests add constraint service_requests_status_check
  check (status in ('pending', 'awaiting_payment', 'paid', 'in_progress', 'done', 'cancelled'));

-- The requester must be able to see their own request to know it's been
-- priced and to pay for it. They still can't see anyone else's.
create policy service_requests_select_self on service_requests
  for select to authenticated
  using (user_id = auth.uid());

-- Payments for services reuse the existing `payments` ledger, which was
-- built for courses only — make the course link optional and add a service
-- link, so one table still records every payment the platform takes.
alter table payments alter column course_id drop not null;
alter table payments add column service_request_id uuid references service_requests (id) on delete cascade;
alter table payments add constraint payments_target_check
  check (course_id is not null or service_request_id is not null);
create index payments_service_request_idx on payments (service_request_id);
