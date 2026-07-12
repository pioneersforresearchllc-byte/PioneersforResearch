-- Research Academy — storage buckets
-- Convention: every object path is "<scope-id>/<filename>", where scope-id
-- is whatever the policy below checks against (a user id, a conversation
-- id, etc.) — read via (storage.foldername(name))[1].

insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('course-images', 'course-images', true),
  ('article-images', 'article-images', true),
  ('certificate-templates', 'certificate-templates', false),
  ('certificate-issuances', 'certificate-issuances', false),
  ('chat-attachments', 'chat-attachments', false),
  ('assignment-files', 'assignment-files', false),
  ('submission-files', 'submission-files', false)
on conflict (id) do nothing;

-- ── avatars: path "<user-id>/<filename>", public read, owner-only write ──
create policy avatars_read_public on storage.objects
  for select to anon, authenticated using (bucket_id = 'avatars');
create policy avatars_write_own on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── course-images / article-images: public read, owner/teacher write ─────
create policy course_images_read_public on storage.objects
  for select to anon, authenticated using (bucket_id = 'course-images');
create policy course_images_write_owner on storage.objects
  for all to authenticated
  using (bucket_id = 'course-images' and public.is_verified_owner())
  with check (bucket_id = 'course-images' and public.is_verified_owner());

create policy article_images_read_public on storage.objects
  for select to anon, authenticated using (bucket_id = 'article-images');
create policy article_images_write_teacher on storage.objects
  for all to authenticated
  using (bucket_id = 'article-images' and (public.current_role() = 'teacher' or public.is_verified_owner()))
  with check (bucket_id = 'article-images' and (public.current_role() = 'teacher' or public.is_verified_owner()));

-- ── certificate-templates: owner only ────────────────────────────────────
create policy certificate_templates_bucket_owner on storage.objects
  for all to authenticated
  using (bucket_id = 'certificate-templates' and public.is_verified_owner())
  with check (bucket_id = 'certificate-templates' and public.is_verified_owner());

-- ── certificate-issuances: path "<student-id>/<filename>" ────────────────
create policy certificate_issuances_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'certificate-issuances'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_verified_owner())
  );
create policy certificate_issuances_write_owner on storage.objects
  for all to authenticated
  using (bucket_id = 'certificate-issuances' and public.is_verified_owner())
  with check (bucket_id = 'certificate-issuances' and public.is_verified_owner());

-- ── chat-attachments: path "<conversation-id>/<filename>" ────────────────
create policy chat_attachments_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (
      public.is_conversation_member(((storage.foldername(name))[1])::uuid)
      or public.is_verified_owner()
    )
  );
create policy chat_attachments_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and public.is_conversation_member(((storage.foldername(name))[1])::uuid)
  );

-- ── assignment-files: path "<course-id>/<filename>", teacher-authored ────
create policy assignment_files_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'assignment-files'
    and (
      public.teaches_course(((storage.foldername(name))[1])::uuid)
      or public.is_enrolled(((storage.foldername(name))[1])::uuid)
      or public.is_verified_owner()
    )
  );
create policy assignment_files_write on storage.objects
  for all to authenticated
  using (
    bucket_id = 'assignment-files'
    and (public.teaches_course(((storage.foldername(name))[1])::uuid) or public.is_verified_owner())
  )
  with check (
    bucket_id = 'assignment-files'
    and (public.teaches_course(((storage.foldername(name))[1])::uuid) or public.is_verified_owner())
  );

-- ── submission-files: path "<student-id>/<filename>" ──────────────────────
create policy submission_files_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'submission-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_verified_owner()
      or exists (
        select 1 from submissions s
        join assignments a on a.id = s.assignment_id
        where s.student_id::text = (storage.foldername(name))[1]
          and public.teaches_course(a.course_id)
      )
    )
  );
create policy submission_files_write_own on storage.objects
  for all to authenticated
  using (bucket_id = 'submission-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'submission-files' and (storage.foldername(name))[1] = auth.uid()::text);
