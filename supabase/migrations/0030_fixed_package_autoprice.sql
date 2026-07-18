-- Auto-price service requests whose chosen package has a fixed price. When a
-- request is created for a non-custom package that has a price, set the final
-- price from the package and move it straight to 'awaiting_payment' so the
-- customer can pay immediately — the owner never re-types (or can change) that
-- price. Custom packages (is_custom / no price) still wait for the owner to
-- price them manually. Done in a trigger so the price is taken from the
-- package server-side and can't be tampered with by the client.
--
-- Written idempotently so a partially-applied run can simply be re-run.

create or replace function public.set_fixed_service_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pkg_price int;
  pkg_custom boolean;
begin
  if new.package_id is not null then
    select price_cents, is_custom into pkg_price, pkg_custom
    from service_packages where id = new.package_id;
    if pkg_price is not null and coalesce(pkg_custom, false) = false then
      new.final_price_cents := pkg_price;
      new.status := 'awaiting_payment';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists service_requests_fixed_price on service_requests;
create trigger service_requests_fixed_price
  before insert on service_requests
  for each row execute function public.set_fixed_service_price();
