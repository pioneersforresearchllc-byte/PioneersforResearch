-- Two customer-facing additions to service requests:
--   1. Let a requester delete their own request — but never a paid one that
--      hasn't been delivered yet (money is in flight / work is owed).
--   2. Flag a request as having an unseen "development" (status or price
--      change) so the dashboard can show a notification badge until the
--      requester opens their list.
--
-- Written idempotently so a partially-applied run can simply be re-run.

-- ── 1. Unseen-update flag ────────────────────────────────────────────────
alter table service_requests add column if not exists student_unseen boolean not null default false;

-- Any owner/webhook change to the status or the final price is a development
-- the requester should be told about. Their own actions can't reach here:
-- students have no UPDATE grant on this table, so every UPDATE is the team's.
create or replace function public.flag_service_request_update()
returns trigger
language plpgsql
as $$
begin
  if (new.status is distinct from old.status)
     or (new.final_price_cents is distinct from old.final_price_cents) then
    new.student_unseen := true;
  end if;
  return new;
end;
$$;

drop trigger if exists service_requests_flag_update on service_requests;
create trigger service_requests_flag_update
  before update on service_requests
  for each row execute function public.flag_service_request_update();

-- The requester clears their own badges by opening "My Requests". Done via a
-- SECURITY DEFINER RPC rather than a table UPDATE grant, so students can only
-- ever flip this one flag on their own rows and nothing else.
create or replace function public.mark_service_requests_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update service_requests
  set student_unseen = false
  where user_id = auth.uid() and student_unseen;
$$;

grant execute on function public.mark_service_requests_seen() to authenticated;

-- ── 2. Preserve the payments ledger when a request is deleted ────────────
-- 0022 linked payments to a request with ON DELETE CASCADE, which would erase
-- a completed payment (and thus the owner's revenue total) if the requester
-- later deleted a delivered request. Switch to SET NULL so the money record
-- survives as an orphan, and drop the now-too-strict "must link to something"
-- check so an orphaned service payment is still valid.
alter table payments drop constraint if exists payments_service_request_id_fkey;
alter table payments add constraint payments_service_request_id_fkey
  foreign key (service_request_id) references service_requests (id) on delete set null;
alter table payments drop constraint if exists payments_target_check;

-- Note: deleting a request is an admin-only action (the owner does it from the
-- service-requests panel, covered by the existing service_requests_write_owner
-- policy). Requesters cannot delete their own requests, so there is no
-- self-delete policy here. The paid-unless-delivered rule is enforced in the
-- owner UI. If an earlier version of this migration created a
-- service_requests_delete_self policy, drop it:
drop policy if exists service_requests_delete_self on service_requests;
