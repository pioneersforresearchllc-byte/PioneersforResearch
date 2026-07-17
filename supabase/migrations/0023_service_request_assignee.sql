-- Let the owner assign a teacher to deliver a specific service request, and
-- let that teacher see the request they're responsible for.
alter table service_requests add column if not exists assigned_teacher_id uuid
  references profiles (id) on delete set null;
create index if not exists service_requests_assignee_idx on service_requests (assigned_teacher_id);

-- The assignee needs to read the brief (and its attachments) to do the work.
-- They still can't see requests assigned to anyone else.
drop policy if exists service_requests_select_assignee on service_requests;
create policy service_requests_select_assignee on service_requests
  for select to authenticated
  using (assigned_teacher_id = auth.uid());

-- ...including the customer's uploaded brief/data file.
drop policy if exists service_request_files_read_assignee on storage.objects;
create policy service_request_files_read_assignee on storage.objects
  for select to authenticated
  using (
    bucket_id = 'service-request-files'
    and exists (
      select 1 from service_requests r
      where r.assigned_teacher_id = auth.uid()
        and (r.content_file_url = storage.objects.name or r.reference_file_url = storage.objects.name)
    )
  );

-- The assignee moves the work along (in_progress → done) but must not be
-- able to touch pricing or payment state, so this is a narrow update policy:
-- only rows already assigned to them, and only once payment has landed.
drop policy if exists service_requests_update_assignee on service_requests;
create policy service_requests_update_assignee on service_requests
  for update to authenticated
  using (assigned_teacher_id = auth.uid() and status in ('paid', 'in_progress'))
  with check (assigned_teacher_id = auth.uid() and status in ('paid', 'in_progress', 'done'));
