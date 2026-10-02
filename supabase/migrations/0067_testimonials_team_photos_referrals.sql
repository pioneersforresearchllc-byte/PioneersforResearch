-- 0067: testimonials, team photos, referrals.
-- Idempotent: safe to re-run.

-- ── Team member photos (expert profile cards on the homepage) ─────────────
alter table team_members add column if not exists photo_url text;

-- ── Testimonials ──────────────────────────────────────────────────────────
-- Customers submit a review from their dashboard; it stays hidden until the
-- owner approves it. Only approved rows are public.
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete set null,
  name text not null,
  subtitle text,              -- e.g. "طالبة ماجستير — تمريض"
  stars int not null default 5 check (stars between 1 and 5),
  body text not null,
  approved boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.testimonials enable row level security;

drop policy if exists testimonials_select on public.testimonials;
create policy testimonials_select on public.testimonials
  for select to anon, authenticated
  using (approved or user_id = auth.uid() or public.is_verified_owner());

drop policy if exists testimonials_insert_self on public.testimonials;
create policy testimonials_insert_self on public.testimonials
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_verified_owner());

drop policy if exists testimonials_owner_write on public.testimonials;
create policy testimonials_owner_write on public.testimonials
  for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

-- A customer can never publish their own review: approval is owner-only.
create or replace function public.guard_testimonial_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_verified_owner() then
    new.approved := false;
    new.sort_order := 0;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_testimonial_insert on public.testimonials;
create trigger trg_guard_testimonial_insert
  before insert on public.testimonials
  for each row execute function public.guard_testimonial_insert();

-- ── Referrals ─────────────────────────────────────────────────────────────
alter table profiles add column if not exists referred_by uuid references profiles (id) on delete set null;

-- referred_by may only be set through apply_referral (or by an owner / the server).
create or replace function public.guard_referred_by()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.referred_by is distinct from old.referred_by
     and auth.uid() is not null
     and not public.is_verified_owner()
     and current_setting('pioneers.applying_referral', true) is distinct from 'on' then
    new.referred_by := old.referred_by;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_referred_by on profiles;
create trigger trg_guard_referred_by
  before update on profiles
  for each row execute function public.guard_referred_by();

-- Called once by a newly registered user who arrived via /register?ref=<username>.
-- Sets referred_by only if it is still empty, the referrer exists and is not
-- the user, and the account is less than 2 days old (no back-dating referrals).
-- It flags itself so the guard above lets its own update through.
create or replace function public.apply_referral(p_username text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_ref uuid;
  v_me profiles%rowtype;
begin
  if auth.uid() is null then return false; end if;
  select * into v_me from profiles where id = auth.uid();
  if not found or v_me.referred_by is not null or v_me.created_at < now() - interval '2 days' then
    return false;
  end if;
  select id into v_ref from profiles where lower(username) = lower(trim(p_username)) limit 1;
  if v_ref is null or v_ref = auth.uid() then return false; end if;
  perform set_config('pioneers.applying_referral', 'on', true);
  update profiles set referred_by = v_ref where id = auth.uid();
  perform set_config('pioneers.applying_referral', 'off', true);
  return true;
end; $$;

grant execute on function public.apply_referral(text) to authenticated;

-- Check
select
  (select count(*) from information_schema.columns where table_name = 'team_members' and column_name = 'photo_url') as team_photo_col,
  (select count(*) from information_schema.tables where table_name = 'testimonials') as testimonials_table,
  (select count(*) from information_schema.columns where table_name = 'profiles' and column_name = 'referred_by') as referred_by_col;
