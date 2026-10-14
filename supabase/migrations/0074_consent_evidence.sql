-- Stronger consent evidence (builds on 0073).
--
-- 1. terms_acceptances survives account deletion: the FK to profiles (ON DELETE
--    CASCADE) is dropped, and each row snapshots the email + name at the time.
-- 2. Every row records the client IP (from the request headers, set server-side)
--    and doc_hash = SHA-256 of the exact legal texts that were displayed, so the
--    archived text of each version can be matched to the acceptance.
-- 3. consent_events: an append-only ledger of the other consents — the
--    no-refund acknowledgement at payment time, marketing opt-in / opt-out, and
--    the sensitive-data + terms confirmation on service requests (anonymous
--    visitors included).
-- 4. marketing_recipient_ids(): users whose latest marketing choice is opt-in
--    (used by admin-broadcast for marketing emails).
--
-- Nobody (owner included) can update or delete these rows through the API —
-- there are no update/delete policies. Idempotent: safe to re-run.

-- ── helpers ────────────────────────────────────────────────────────────────
create or replace function public.request_client_ip()
returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.headers', true)::json ->> 'cf-connecting-ip', ''),
    nullif(trim(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)), ''),
    null
  )
$$;

-- ── 1+2. terms_acceptances ────────────────────────────────────────────────
alter table public.terms_acceptances drop constraint if exists terms_acceptances_user_id_fkey;
alter table public.terms_acceptances add column if not exists email text;
alter table public.terms_acceptances add column if not exists full_name text;
alter table public.terms_acceptances add column if not exists ip text;
alter table public.terms_acceptances add column if not exists doc_hash text;
alter table public.terms_acceptances add column if not exists context text;

create or replace function public.terms_acc_set_time()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.accepted_at := now();
  new.ip := public.request_client_ip();
  select u.email into new.email from auth.users u where u.id = new.user_id;
  select p.name into new.full_name from public.profiles p where p.id = new.user_id;
  return new;
end;
$$;
drop trigger if exists terms_acc_set_time on public.terms_acceptances;
create trigger terms_acc_set_time before insert on public.terms_acceptances
  for each row execute function public.terms_acc_set_time();

-- Backfill the email/name snapshot for rows written before this migration.
update public.terms_acceptances t
   set email = coalesce(t.email, u.email)
  from auth.users u
 where u.id = t.user_id and t.email is null;
update public.terms_acceptances t
   set full_name = coalesce(t.full_name, p.name)
  from public.profiles p
 where p.id = t.user_id and t.full_name is null;

-- ── 3. consent_events ─────────────────────────────────────────────────────
create table if not exists public.consent_events (
  id bigserial primary key,
  user_id uuid,                       -- null for anonymous visitors (no FK: must survive deletion)
  email text,
  full_name text,
  kind text not null check (kind in (
    'payment_no_refund',              -- ticked "I agree, no refund after payment" before paying
    'marketing_opt_in',
    'marketing_opt_out',
    'sensitive_data',                 -- consent to process health / participant data in uploaded files
    'service_request_terms'           -- accepted the terms when sending a service request
  )),
  ref text,                           -- what it relates to (course id, invoice id, consultation id, service slug…)
  terms_version text,
  doc_hash text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists consent_events_user_idx on public.consent_events (user_id, kind, created_at desc);
create index if not exists consent_events_email_idx on public.consent_events (lower(email));
alter table public.consent_events enable row level security;

drop policy if exists consent_select on public.consent_events;
create policy consent_select on public.consent_events
  for select to authenticated
  using (user_id = auth.uid() or public.is_verified_owner());

drop policy if exists consent_insert_user on public.consent_events;
create policy consent_insert_user on public.consent_events
  for insert to authenticated
  with check (user_id = auth.uid());

-- Anonymous service requests (no account) can still leave a consent record.
drop policy if exists consent_insert_anon on public.consent_events;
create policy consent_insert_anon on public.consent_events
  for insert to anon
  with check (user_id is null and kind in ('service_request_terms', 'sensitive_data', 'marketing_opt_in'));

create or replace function public.consent_events_fill()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  new.ip := public.request_client_ip();
  new.email := left(new.email, 320);
  new.full_name := left(new.full_name, 200);
  new.ref := left(new.ref, 200);
  new.user_agent := left(new.user_agent, 300);
  if new.user_id is not null then
    select coalesce(u.email, new.email) into new.email from auth.users u where u.id = new.user_id;
    select coalesce(p.name, new.full_name) into new.full_name from public.profiles p where p.id = new.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists consent_events_fill on public.consent_events;
create trigger consent_events_fill before insert on public.consent_events
  for each row execute function public.consent_events_fill();

grant select, insert on public.consent_events to authenticated;
grant insert on public.consent_events to anon;
grant usage, select on sequence public.consent_events_id_seq to authenticated, anon;

-- ── 4. marketing audience ─────────────────────────────────────────────────
create or replace function public.marketing_recipient_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select user_id from (
    select distinct on (user_id) user_id, kind
      from public.consent_events
     where user_id is not null and kind in ('marketing_opt_in', 'marketing_opt_out')
     order by user_id, created_at desc
  ) latest
  where kind = 'marketing_opt_in'
$$;
revoke all on function public.marketing_recipient_ids() from public, anon, authenticated;
grant execute on function public.marketing_recipient_ids() to service_role;
