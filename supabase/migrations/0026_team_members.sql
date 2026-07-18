-- Admin-managed "our team" list for the homepage About section. The owner can
-- add members, write a short bilingual title and bio for each, reorder them,
-- and hide/delete them. Public visitors read only active rows.
--
-- Written idempotently so a partially-applied run can simply be re-run.

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title_ar text,
  title_en text,
  bio_ar text,
  bio_en text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table team_members enable row level security;

-- Active members are public catalogue data; a verified owner sees all and can
-- change them (this is the admin team editor).
drop policy if exists team_members_select_all on team_members;
create policy team_members_select_all on team_members
  for select to anon, authenticated
  using (active or public.is_verified_owner());

drop policy if exists team_members_write_owner on team_members;
create policy team_members_write_owner on team_members
  for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

grant select on team_members to anon, authenticated;
grant insert, update, delete on team_members to authenticated;
