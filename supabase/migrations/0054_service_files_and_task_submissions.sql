-- Service workspace, round 3:
--   (1) A private storage bucket for files shared inside a service — both chat
--       attachments and task submissions. Access mirrors the workspace: the
--       request's student, its assigned teacher, or a verified owner. Every
--       object is stored under "<request_id>/..." so the RLS can check the
--       first path segment against can_access_request().
--   (2) Task submissions: the student delivers a file, the teacher grades it out
--       of 100 with feedback. The work stays attached for later reference.

-- ── (1) Storage bucket ───────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('service-files', 'service-files', false)
on conflict (id) do nothing;

-- Safe wrappers: parse the request id from the first path segment and answer
-- access, never throwing (a non-uuid folder just returns false). This lets the
-- policies below evaluate on any storage row without a cast error.
create or replace function public.can_access_service_file(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare rid uuid;
begin
  begin rid := (storage.foldername(p_name))[1]::uuid; exception when others then return false; end;
  return public.can_access_request(rid);
end; $$;
grant execute on function public.can_access_service_file(text) to authenticated;

create or replace function public.can_manage_service_file(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare rid uuid;
begin
  begin rid := (storage.foldername(p_name))[1]::uuid; exception when others then return false; end;
  return public.can_manage_request(rid);
end; $$;
grant execute on function public.can_manage_service_file(text) to authenticated;

drop policy if exists service_files_select on storage.objects;
create policy service_files_select on storage.objects
  for select to authenticated
  using (bucket_id = 'service-files' and public.can_access_service_file(name));

drop policy if exists service_files_insert on storage.objects;
create policy service_files_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'service-files' and public.can_access_service_file(name));

drop policy if exists service_files_delete on storage.objects;
create policy service_files_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'service-files' and public.can_manage_service_file(name));

-- ── (2) Task submission + grading ────────────────────────────────────────
alter table service_tasks add column if not exists submission_url text;
alter table service_tasks add column if not exists submission_name text;
alter table service_tasks add column if not exists submitted_at timestamptz;
alter table service_tasks add column if not exists grade int;
alter table service_tasks add column if not exists feedback text;
alter table service_tasks add column if not exists graded_at timestamptz;

-- The student attaches / re-attaches their deliverable through this function,
-- which touches ONLY the submission columns of a task on their own request.
-- Re-submitting clears any previous grade so the teacher reviews the new file.
create or replace function public.submit_service_task(p_task uuid, p_url text, p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update service_tasks tsk
    set submission_url = p_url,
        submission_name = p_name,
        submitted_at = now(),
        grade = null,
        feedback = null,
        graded_at = null,
        done = false
  where tsk.id = p_task
    and exists (select 1 from service_requests r where r.id = tsk.request_id and r.user_id = auth.uid());
end; $$;
grant execute on function public.submit_service_task(uuid, text, text) to authenticated;

-- The student may also withdraw their submission (before grading).
create or replace function public.clear_service_task_submission(p_task uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update service_tasks tsk
    set submission_url = null, submission_name = null, submitted_at = null
  where tsk.id = p_task
    and tsk.graded_at is null
    and exists (select 1 from service_requests r where r.id = tsk.request_id and r.user_id = auth.uid());
end; $$;
grant execute on function public.clear_service_task_submission(uuid) to authenticated;

-- Teachers/owners grade through their existing can_manage_request write policy
-- (a normal UPDATE on grade/feedback/graded_at), so no extra function is needed.
