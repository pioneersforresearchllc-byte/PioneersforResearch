-- Service requests are now sign-in only. Previously anonymous visitors could
-- submit a brief; requiring an account ties every request to a real user we
-- can follow up with, and gives us a spam/abuse handle.
drop policy service_requests_insert_any on service_requests;

-- user_id must be the caller's own id — so a request can't be filed under
-- someone else's account.
create policy service_requests_insert_self on service_requests
  for insert to authenticated
  with check (user_id = auth.uid());

revoke insert on service_requests from anon;

-- Same for the brief/data attachments that go with a request.
drop policy service_request_files_insert on storage.objects;
create policy service_request_files_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'service-request-files');
