-- Lets a verified owner upload/replace any user's avatar (needed to set
-- the AI assistant's avatar, since it has no real login session of its
-- own — also generally useful for moderating inappropriate avatars later).
drop policy avatars_write_own on storage.objects;
create policy avatars_write_own on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_verified_owner()))
  with check (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_verified_owner()));
