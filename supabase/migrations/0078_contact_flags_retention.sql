-- Retention for contact_flags (0077): the original text of a masked chat
-- message is kept for evidence for 12 months, then destroyed — as stated in
-- the Privacy Policy. Daily pg_cron job. Idempotent: safe to re-run.
-- Needs 0077 applied first (contact_flags must exist).

create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname = 'contact-flags-retention';

select cron.schedule(
  'contact-flags-retention',
  '30 2 * * *',  -- 02:30 UTC daily
  $$ delete from public.contact_flags where created_at < now() - interval '12 months'; $$
);

-- Check: the job is scheduled.
select jobname, schedule, active from cron.job where jobname = 'contact-flags-retention';
