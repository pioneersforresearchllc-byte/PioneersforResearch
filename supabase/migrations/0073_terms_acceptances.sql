-- Evidence of acceptance of the legal documents (Terms, Privacy, Refund).
-- One row per user per document version; written by the user themself when
-- they tick "I agree" (signup or the in-dashboard prompt after an update).
-- Rows are append-only for users: no update/delete, so the record can't be
-- altered after the fact. Idempotent: safe to re-run.

create table if not exists public.terms_acceptances (
  user_id uuid not null references public.profiles (id) on delete cascade,
  version text not null,
  accepted_at timestamptz not null default now(),
  user_agent text,
  primary key (user_id, version)
);
alter table public.terms_acceptances enable row level security;

drop policy if exists terms_acc_select on public.terms_acceptances;
create policy terms_acc_select on public.terms_acceptances
  for select to authenticated
  using (user_id = auth.uid() or public.is_verified_owner());

drop policy if exists terms_acc_insert on public.terms_acceptances;
create policy terms_acc_insert on public.terms_acceptances
  for insert to authenticated
  with check (user_id = auth.uid());

-- Server-side timestamp: ignore whatever time the browser sends.
create or replace function public.terms_acc_set_time()
returns trigger language plpgsql as $$
begin
  new.accepted_at := now();
  return new;
end;
$$;
drop trigger if exists terms_acc_set_time on public.terms_acceptances;
create trigger terms_acc_set_time before insert on public.terms_acceptances
  for each row execute function public.terms_acc_set_time();

grant select, insert on public.terms_acceptances to authenticated;
