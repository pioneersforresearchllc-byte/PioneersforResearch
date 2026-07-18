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

-- ── 3. Self-delete, guarded by status ────────────────────────────────────
-- A requester may delete their own request only when nothing is owed on it:
-- unpaid stages (pending / awaiting_payment / cancelled) or an already
-- delivered one (done). A 'paid' or 'in_progress' request can't be removed
-- until it's delivered. (DELETE is already granted to authenticated in 0020;
-- this policy is what actually scopes it to safe rows.)
drop policy if exists service_requests_delete_self on service_requests;
create policy service_requests_delete_self on service_requests
  for delete to authenticated
  using (
    user_id = auth.uid()
    and status in ('pending', 'awaiting_payment', 'cancelled', 'done')
  );
