-- Trainer Agreement — new version 2026-10-15 (wording: "مدرّب/Trainer"
-- replaces "مستشار/Consultant" throughout; identifiers unchanged).
-- Must match CONSULTANT_AGREEMENT_VERSION in web/src/lib/consultantAgreement.ts.
-- From now on an acceptance of the required version OR NEWER counts, so a
-- trainer who accepts a newly published text is never blocked while the
-- matching migration is pending. Idempotent: safe to re-run. Needs 0079.

create or replace function public.consultant_agreement_version()
returns text language sql immutable as $$ select '2026-10-15'::text $$;

create or replace function public.consultant_signed(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.consent_events
     where user_id = p_user
       and kind = 'consultant_agreement'
       and terms_version >= public.consultant_agreement_version()
  )
$$;
revoke all on function public.consultant_signed(uuid) from public, anon, authenticated;

-- Check: required version and who has signed it.
select public.consultant_agreement_version() as required_version;
select p.name, p.username, public.consultant_signed(p.id) as signed
  from public.profiles p
 where p.role = 'teacher' and p.status = 'active'
 order by signed, p.name;
