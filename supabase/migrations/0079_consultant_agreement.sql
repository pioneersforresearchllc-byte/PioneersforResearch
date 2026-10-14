-- Consultant & Trainer Agreement (builds on 0074 consent_events).
--
-- 1. consent_events accepts kind 'consultant_agreement' (terms_version = the
--    agreement version, doc_hash = SHA-256 of its text).
-- 2. consultant_agreement_version(): the version currently required. Keep it
--    in sync with CONSULTANT_AGREEMENT_VERSION in web/src/lib/consultantAgreement.ts;
--    bumping it (in a new migration) makes every consultant re-accept before
--    getting new requests.
-- 3. has_consultant_agreement(user): for the consultant themself or the owner.
-- 4. A request can't be assigned to a consultant who hasn't accepted the
--    current version — enforced in the database, not just the UI.
-- Idempotent: safe to re-run. Needs 0074.

-- ── 1. allow the new kind ─────────────────────────────────────────────────
alter table public.consent_events drop constraint if exists consent_events_kind_check;
alter table public.consent_events add constraint consent_events_kind_check check (kind in (
  'payment_no_refund',
  'marketing_opt_in',
  'marketing_opt_out',
  'sensitive_data',
  'service_request_terms',
  'consultant_agreement'
));

-- ── 2. required version ───────────────────────────────────────────────────
create or replace function public.consultant_agreement_version()
returns text language sql immutable as $$ select '2026-10-14'::text $$;
grant execute on function public.consultant_agreement_version() to authenticated;

-- ── 3. has the user accepted it? ──────────────────────────────────────────
create or replace function public.consultant_signed(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.consent_events
     where user_id = p_user
       and kind = 'consultant_agreement'
       and terms_version = public.consultant_agreement_version()
  )
$$;
revoke all on function public.consultant_signed(uuid) from public, anon, authenticated;

create or replace function public.has_consultant_agreement(p_user uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if p_user is distinct from auth.uid() and not public.is_verified_owner() then
    raise exception 'not allowed';
  end if;
  return public.consultant_signed(p_user);
end;
$$;
grant execute on function public.has_consultant_agreement(uuid) to authenticated;

-- ── 4. block assignment without the agreement ─────────────────────────────
create or replace function public.require_consultant_agreement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_teacher_id is not null
     and (tg_op = 'INSERT' or new.assigned_teacher_id is distinct from old.assigned_teacher_id)
     and not public.consultant_signed(new.assigned_teacher_id) then
    raise exception 'consultant_agreement_missing'
      using hint = 'The consultant must accept the current Consultant & Trainer Agreement before a request can be assigned.';
  end if;
  return new;
end;
$$;
drop trigger if exists service_requests_require_agreement on public.service_requests;
create trigger service_requests_require_agreement
  before insert or update of assigned_teacher_id on public.service_requests
  for each row execute function public.require_consultant_agreement();

-- Check: consultants (active teachers) and whether they have signed.
select p.name, p.username, public.consultant_signed(p.id) as signed
  from public.profiles p
 where p.role = 'teacher' and p.status = 'active'
 order by signed, p.name;
