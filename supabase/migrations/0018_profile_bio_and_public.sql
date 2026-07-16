-- Public profile card: a short bio users can write about themselves, and a
-- toggle controlling whether other users may open their profile card (name,
-- avatar, bio, and — for teachers — specialty/qualification). Certificates
-- shown on the card are read through existing certificate policies, gated by
-- this same flag in the client.
alter table profiles add column bio text;
alter table profiles add column profile_public boolean not null default true;

-- Let any authenticated user read the certificate issuances of a user who
-- has a public profile, so the public profile card can show their earned
-- certificates. profiles_select is `using (true)`, so this subquery is safe
-- (no policy cycle — profiles never references certificate_issuances).
create policy certificate_issuances_select_public on certificate_issuances
  for select to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = certificate_issuances.student_id and p.profile_public = true
    )
  );
