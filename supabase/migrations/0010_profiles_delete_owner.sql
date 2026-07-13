-- Lets the owner remove an admin (or any) profile row. Deleting the row
-- alone (not the underlying auth.users entry) is enough to lock that
-- account out of the app, since every dashboard route fetches the profile
-- and treats a missing one as unauthenticated.
create policy profiles_delete_owner on profiles
  for delete to authenticated
  using (public.is_verified_owner());
