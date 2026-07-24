-- Institution team management. The institution's admin (its primary contact,
-- or a member flagged 'admin') can manage its own team. Creating a member
-- account goes through the create-institution-member Edge Function (service
-- role, since it creates an auth user); this policy covers listing, role
-- changes and removal from the client.
--
-- Written idempotently so a partially-applied run can simply be re-run.

create or replace function public.is_institution_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from institutions
    where id = public.current_institution_id() and primary_contact_user_id = auth.uid()
  ) or exists (
    select 1 from institution_members m
    where m.institution_id = public.current_institution_id()
      and m.user_id = auth.uid()
      and m.member_role = 'admin'
  );
$$;
grant execute on function public.is_institution_admin() to authenticated;

drop policy if exists inst_members_admin_manage on institution_members;
create policy inst_members_admin_manage on institution_members
  for all to authenticated
  using (institution_id = public.current_institution_id() and public.is_institution_admin())
  with check (institution_id = public.current_institution_id() and public.is_institution_admin());
