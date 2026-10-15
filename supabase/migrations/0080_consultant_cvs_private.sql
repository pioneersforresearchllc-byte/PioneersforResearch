-- 0080: consultant CVs become owner-only and are kept after approval.
--
-- The CV text and file path lived on `profiles`, whose select policy is
-- `using (true)` for every signed-in user — so any student could read every
-- consultant's CV. They now live in consultant_cvs, readable only by a
-- verified owner. A trigger moves CV fields off any profile insert/update,
-- so create-profile and the apply forms keep working unchanged.
-- Existing CVs (including already-approved consultants) are copied over first.
-- Idempotent: safe to re-run.

create table if not exists public.consultant_cvs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  cv_text text,
  cv_file_url text,
  updated_at timestamptz not null default now()
);

alter table public.consultant_cvs enable row level security;

drop policy if exists consultant_cvs_owner_read on public.consultant_cvs;
create policy consultant_cvs_owner_read on public.consultant_cvs
  for select to authenticated using (public.is_verified_owner());
-- No insert/update/delete policies: only the trigger below writes here.

create or replace function public.stash_profile_cv()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.cv_text is not null or new.cv_file_url is not null then
    insert into consultant_cvs (user_id, cv_text, cv_file_url, updated_at)
    values (new.id, new.cv_text, new.cv_file_url, now())
    on conflict (user_id) do update set
      cv_text = coalesce(excluded.cv_text, consultant_cvs.cv_text),
      cv_file_url = coalesce(excluded.cv_file_url, consultant_cvs.cv_file_url),
      updated_at = now();
    new.cv_text := null;
    new.cv_file_url := null;
  end if;
  return new;
end; $$;

drop trigger if exists trg_stash_profile_cv on public.profiles;
create trigger trg_stash_profile_cv
  before insert or update on public.profiles
  for each row execute function public.stash_profile_cv();

-- Recover every CV still on a profile (pending, approved or dismissed).
insert into public.consultant_cvs (user_id, cv_text, cv_file_url, updated_at)
select p.id, p.cv_text, p.cv_file_url, coalesce(p.created_at, now())
from public.profiles p
join auth.users u on u.id = p.id
where p.cv_text is not null or p.cv_file_url is not null
on conflict (user_id) do update set
  cv_text = coalesce(excluded.cv_text, consultant_cvs.cv_text),
  cv_file_url = coalesce(excluded.cv_file_url, consultant_cvs.cv_file_url);

update public.profiles set cv_text = null, cv_file_url = null
where cv_text is not null or cv_file_url is not null;

-- The CV file itself: owner only (was owner + the applicant).
drop policy if exists teacher_cv_read on storage.objects;
create policy teacher_cv_read on storage.objects
  for select to authenticated
  using (bucket_id = 'teacher-cv-documents' and public.is_verified_owner());

-- Check: number of recovered CVs.
select count(*) as recovered_cvs from public.consultant_cvs;
