-- Private contact phone (WhatsApp) for every individual account.
--
-- Kept OUT of `profiles` on purpose: some profiles (teachers) are public, and
-- the phone must only ever be visible to its owner and the platform owner.
-- Stored as bare international digits (e.g. 9665XXXXXXXX) so it drops straight
-- into a wa.me link. Not verified — collected at signup, editable in Account.
--
-- Idempotent: safe to re-run.

create table if not exists public.profile_contacts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone text not null check (phone ~ '^[0-9]{8,15}$'),
  updated_at timestamptz not null default now()
);
alter table public.profile_contacts enable row level security;

drop policy if exists profile_contacts_select on public.profile_contacts;
create policy profile_contacts_select on public.profile_contacts
  for select to authenticated
  using (user_id = auth.uid() or public.is_verified_owner());

drop policy if exists profile_contacts_insert on public.profile_contacts;
create policy profile_contacts_insert on public.profile_contacts
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_verified_owner());

drop policy if exists profile_contacts_update on public.profile_contacts;
create policy profile_contacts_update on public.profile_contacts
  for update to authenticated
  using (user_id = auth.uid() or public.is_verified_owner())
  with check (user_id = auth.uid() or public.is_verified_owner());

drop policy if exists profile_contacts_delete_owner on public.profile_contacts;
create policy profile_contacts_delete_owner on public.profile_contacts
  for delete to authenticated
  using (public.is_verified_owner());

grant select, insert, update, delete on public.profile_contacts to authenticated;
