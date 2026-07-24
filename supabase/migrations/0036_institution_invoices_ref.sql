-- Track the Stripe session on an institution invoice so the webhook can mark
-- exactly that invoice paid. Bank-transfer invoices simply leave it null and
-- are marked paid by the owner once the transfer lands.
alter table institution_invoices add column if not exists provider_ref text;
create index if not exists inst_invoice_ref_idx on institution_invoices (provider_ref);
