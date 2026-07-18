-- Let one discount code cover multiple products. Previously a code had a single
-- course_id/service_id; now targets live in a join table so a code can apply to
-- any mix of courses and services. Existing single targets are migrated over,
-- then the old columns are dropped.
--
-- Written idempotently so a partially-applied run can simply be re-run.

create table if not exists discount_code_targets (
  id uuid primary key default gen_random_uuid(),
  discount_code_id uuid not null references discount_codes (id) on delete cascade,
  course_id uuid references courses (id) on delete cascade,
  service_id uuid references services (id) on delete cascade,
  constraint dct_target_check check (course_id is not null or service_id is not null)
);
create index if not exists dct_code_idx on discount_code_targets (discount_code_id);
create index if not exists dct_course_idx on discount_code_targets (course_id);
create index if not exists dct_service_idx on discount_code_targets (service_id);

alter table discount_code_targets enable row level security;
drop policy if exists dct_owner on discount_code_targets;
create policy dct_owner on discount_code_targets
  for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());
grant select, insert, update, delete on discount_code_targets to authenticated;

-- Copy any existing single targets into the join table (only once, and only
-- while the old columns still exist).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'discount_codes' and column_name = 'course_id'
  ) and not exists (select 1 from discount_code_targets) then
    insert into discount_code_targets (discount_code_id, course_id, service_id)
    select id, course_id, service_id from discount_codes
    where course_id is not null or service_id is not null;
  end if;
end $$;

alter table discount_codes drop constraint if exists discount_target_check;
alter table discount_codes drop column if exists course_id;
alter table discount_codes drop column if exists service_id;
