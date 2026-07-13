-- 1) Students can no longer edit a submission after turning it in — only
--    insert once (submissions_insert_self) and read; grading is the
--    teacher/owner's job (submissions_update_grading).
drop policy submissions_update_self on submissions;

-- 2) Temporary admins: can do everything a normal owner can except remove
-- other admin accounts. `is_temp_admin` defaults false for existing owners.
alter table profiles add column is_temp_admin boolean not null default false;

drop policy profiles_delete_owner on profiles;
create policy profiles_delete_owner on profiles
  for delete to authenticated
  using (
    public.is_verified_owner()
    and not coalesce((select p.is_temp_admin from profiles p where p.id = auth.uid()), false)
  );
