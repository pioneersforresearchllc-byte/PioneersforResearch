-- Teacher application CV attachment: private bucket, path
-- "<user-id>/<filename>" so only the applicant and the owner can read it
-- (via signed URLs — never made public, never rendered inline as HTML).

alter table profiles add column cv_file_url text;

insert into storage.buckets (id, name, public) values
  ('teacher-cv-documents', 'teacher-cv-documents', false)
on conflict (id) do nothing;

create policy teacher_cv_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'teacher-cv-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_verified_owner())
  );
create policy teacher_cv_write_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'teacher-cv-documents' and (storage.foldername(name))[1] = auth.uid()::text);
