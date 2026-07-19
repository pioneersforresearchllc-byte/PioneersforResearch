-- Private-course access codes. The owner can attach a secret code to a course
-- so specific people enroll for free (no payment) by entering it. The code is
-- kept in its own table with owner-only RLS — never exposed to the public — and
-- is redeemed through the redeem-course-code Edge Function (service role).
--
-- Written idempotently so a partially-applied run can simply be re-run.

create table if not exists course_access_codes (
  course_id uuid primary key references courses (id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now()
);

alter table course_access_codes enable row level security;

drop policy if exists course_access_codes_owner on course_access_codes;
create policy course_access_codes_owner on course_access_codes
  for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

grant select, insert, update, delete on course_access_codes to authenticated;
