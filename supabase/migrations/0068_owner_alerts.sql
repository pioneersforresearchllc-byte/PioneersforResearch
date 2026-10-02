-- 0068: instant owner alerts.
-- After a new service request / contact or quote message / institution
-- consultation / teacher or institution application / uploaded receipt /
-- customer review, a trigger asks the notify-owner edge function (via pg_net)
-- to alert every owner by email, push and the dashboard bell.
-- The function itself refuses stale or repeated alerts (owner_alerts ledger).
-- A failing HTTP call never blocks the original insert/update.
-- Idempotent: safe to re-run.

create extension if not exists pg_net;

create table if not exists public.owner_alerts (
  source text not null,
  row_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (source, row_id)
);
alter table public.owner_alerts enable row level security;
-- No policies: only the edge function (service role) uses it.

create or replace function public.notify_owner_alert()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  begin
    perform net.http_post(
      url := 'https://wdxziibfgkztphpzeieq.supabase.co/functions/v1/notify-owner',
      body := jsonb_build_object('source', tg_argv[0], 'id', new.id),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  exception when others then
    -- never let an alert problem break the customer's action
    null;
  end;
  return new;
end; $$;

drop trigger if exists trg_alert_service_request on service_requests;
create trigger trg_alert_service_request
  after insert on service_requests
  for each row execute function public.notify_owner_alert('service_request');

drop trigger if exists trg_alert_contact on contact_messages;
create trigger trg_alert_contact
  after insert on contact_messages
  for each row execute function public.notify_owner_alert('contact');

drop trigger if exists trg_alert_consultation on institution_consultations;
create trigger trg_alert_consultation
  after insert on institution_consultations
  for each row execute function public.notify_owner_alert('consultation');

drop trigger if exists trg_alert_application on profiles;
create trigger trg_alert_application
  after insert on profiles
  for each row when (new.role in ('teacher', 'institution'))
  execute function public.notify_owner_alert('application');

drop trigger if exists trg_alert_receipt on student_invoices;
create trigger trg_alert_receipt
  after update on student_invoices
  for each row when (new.status = 'submitted' and old.status is distinct from 'submitted')
  execute function public.notify_owner_alert('receipt');

drop trigger if exists trg_alert_review on testimonials;
create trigger trg_alert_review
  after insert on testimonials
  for each row when (not new.approved)
  execute function public.notify_owner_alert('review');

-- Check: should list 6 triggers.
select event_object_table as table_name, trigger_name
from information_schema.triggers
where trigger_name like 'trg_alert_%'
order by 1;
