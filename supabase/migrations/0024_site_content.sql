-- Admin-editable homepage copy. Each row overrides one translation key; the
-- site falls back to the built-in default text for any key with no row (or a
-- blank value for the current language), so the homepage always renders even
-- before the owner customises anything.
create table site_content (
  key text primary key,
  value_ar text,
  value_en text,
  updated_at timestamptz not null default now()
);

alter table site_content enable row level security;

-- Public read (the homepage is public); only a verified owner may edit.
create policy site_content_select_all on site_content for select to anon, authenticated using (true);
create policy site_content_write_owner on site_content for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

grant select on site_content to anon, authenticated;
grant select, insert, update, delete on site_content to authenticated, service_role;
