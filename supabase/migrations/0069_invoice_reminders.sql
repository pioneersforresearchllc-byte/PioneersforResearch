-- 0069: automatic payment reminders for unpaid student invoices.
-- Adds reminder tracking columns and a daily pg_cron job (10:00 Riyadh time)
-- that calls the invoice-reminders edge function. The function itself only
-- reminds invoices whose last reminder was 2+ days ago (max 6 automatic ones),
-- so running daily = "every 2 days" per invoice.
-- Idempotent: safe to re-run.

alter table student_invoices add column if not exists reminder_count int not null default 0;
alter table student_invoices add column if not exists last_reminded_at timestamptz;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace any previous schedule with the same name.
select cron.unschedule(jobid) from cron.job where jobname = 'invoice-reminders';

select cron.schedule(
  'invoice-reminders',
  '0 7 * * *',  -- 07:00 UTC = 10:00 Riyadh
  $$
  select net.http_post(
    url := 'https://wdxziibfgkztphpzeieq.supabase.co/functions/v1/invoice-reminders',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);

-- Check: the job is scheduled.
select jobname, schedule, active from cron.job where jobname = 'invoice-reminders';
