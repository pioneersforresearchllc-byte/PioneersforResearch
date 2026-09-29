-- 0066: make "hide price" (0058) actually private.
--
-- hide_price only hid the number in the UI; services / service_packages are
-- publicly readable, so the real prices were still sent to every visitor's
-- browser (visible in dev tools / the network tab).
--
-- Now, while a service has hide_price = true, its price columns (and those of
-- its packages) are moved into owner-only tables and the public rows hold
-- NULL. Un-hiding moves them back. The owner's editor reads the private tables
-- and keeps working unchanged (saving a price on a hidden service just lands in
-- the private table). A hidden package has no public price, so the fixed-price
-- auto-pricing (0030) skips it and the owner quotes each request.
-- Idempotent: safe to re-run.

create table if not exists public.service_private_prices (
  service_id uuid primary key references services (id) on delete cascade,
  price_cents int,
  original_price_cents int
);
create table if not exists public.package_private_prices (
  package_id uuid primary key references service_packages (id) on delete cascade,
  price_cents int,
  original_price_cents int
);
alter table public.service_private_prices enable row level security;
alter table public.package_private_prices enable row level security;

drop policy if exists service_private_prices_owner on public.service_private_prices;
create policy service_private_prices_owner on public.service_private_prices
  for all to authenticated using (public.is_verified_owner()) with check (public.is_verified_owner());
drop policy if exists package_private_prices_owner on public.package_private_prices;
create policy package_private_prices_owner on public.package_private_prices
  for all to authenticated using (public.is_verified_owner()) with check (public.is_verified_owner());

-- ── services ──────────────────────────────────────────────────────────────
create or replace function public.stash_hidden_service_price()
returns trigger language plpgsql security definer set search_path = public as $$
declare priv record;
begin
  if new.hide_price then
    if new.price_cents is not null or new.original_price_cents is not null then
      insert into service_private_prices (service_id, price_cents, original_price_cents)
      values (new.id, new.price_cents, new.original_price_cents)
      on conflict (service_id) do update
        set price_cents = excluded.price_cents, original_price_cents = excluded.original_price_cents;
    end if;
    new.price_cents := null;
    new.original_price_cents := null;
  elsif tg_op = 'UPDATE' and old.hide_price then
    -- Un-hidden: bring the stored prices back unless new ones were just typed in.
    select * into priv from service_private_prices where service_id = new.id;
    if found then
      if new.price_cents is null and new.original_price_cents is null then
        new.price_cents := priv.price_cents;
        new.original_price_cents := priv.original_price_cents;
      end if;
      delete from service_private_prices where service_id = new.id;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_stash_hidden_service_price on services;
create trigger trg_stash_hidden_service_price
  before insert or update on services
  for each row execute function public.stash_hidden_service_price();

-- When hide_price flips, re-run the package trigger on that service's packages.
create or replace function public.sync_hidden_package_prices()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.hide_price is distinct from old.hide_price then
    update service_packages set price_cents = price_cents where service_id = new.id;
  end if;
  return null;
end; $$;

drop trigger if exists trg_sync_hidden_package_prices on services;
create trigger trg_sync_hidden_package_prices
  after update on services
  for each row execute function public.sync_hidden_package_prices();

-- ── service_packages ──────────────────────────────────────────────────────
create or replace function public.stash_hidden_package_price()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  hidden boolean;
  priv record;
begin
  select s.hide_price into hidden from services s where s.id = new.service_id;
  if coalesce(hidden, false) then
    if new.price_cents is not null or new.original_price_cents is not null then
      insert into package_private_prices (package_id, price_cents, original_price_cents)
      values (new.id, new.price_cents, new.original_price_cents)
      on conflict (package_id) do update
        set price_cents = excluded.price_cents, original_price_cents = excluded.original_price_cents;
    end if;
    new.price_cents := null;
    new.original_price_cents := null;
  else
    select * into priv from package_private_prices where package_id = new.id;
    if found then
      if new.price_cents is null and new.original_price_cents is null then
        new.price_cents := priv.price_cents;
        new.original_price_cents := priv.original_price_cents;
      end if;
      delete from package_private_prices where package_id = new.id;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_stash_hidden_package_price on service_packages;
create trigger trg_stash_hidden_package_price
  before insert or update on service_packages
  for each row execute function public.stash_hidden_package_price();

-- ── Move the prices of services that are already hidden ──────────────────
update services set price_cents = price_cents where hide_price;
update service_packages p set price_cents = p.price_cents
  from services s where s.id = p.service_id and s.hide_price;

-- ── Account deletion: "Database error deleting user" ─────────────────────
-- Four 0001 foreign keys to profiles had no ON DELETE rule, so deleting any
-- user who ever created an assignment/conversation or sent a message failed.
-- Keep their content (a teacher's assignments hold student submissions) and
-- just drop the author link; join requests they made go with them.
alter table assignments alter column created_by drop not null;
alter table assignments drop constraint if exists assignments_created_by_fkey;
alter table assignments add constraint assignments_created_by_fkey
  foreign key (created_by) references profiles (id) on delete set null;

alter table conversations alter column created_by drop not null;
alter table conversations drop constraint if exists conversations_created_by_fkey;
alter table conversations add constraint conversations_created_by_fkey
  foreign key (created_by) references profiles (id) on delete set null;

alter table messages alter column sender_id drop not null;
alter table messages drop constraint if exists messages_sender_id_fkey;
alter table messages add constraint messages_sender_id_fkey
  foreign key (sender_id) references profiles (id) on delete set null;

alter table conversation_join_requests drop constraint if exists conversation_join_requests_requested_by_fkey;
alter table conversation_join_requests add constraint conversation_join_requests_requested_by_fkey
  foreign key (requested_by) references profiles (id) on delete cascade;

-- Check: every hidden service should now show NULL prices publicly,
-- with the real numbers kept in service_private_prices.
select s.slug, s.hide_price, s.price_cents as public_price, pp.price_cents as private_price
from services s left join service_private_prices pp on pp.service_id = s.id
order by s.sort_order;
