-- Lets an anonymous visitor log in with either a username or an email:
-- resolves a username to its account email (minimal, purpose-built leak —
-- login-by-username inherently allows existence enumeration; this returns
-- nothing else). If the identifier already looks like an email it's
-- returned unchanged so the caller can always just call this then sign in.
create or replace function public.resolve_login_identifier(identifier text)
returns text
language sql stable security definer set search_path = public, auth as $$
  select case
    when identifier ilike '%@%' then identifier
    else (
      select u.email from profiles p
      join auth.users u on u.id = p.id
      where p.username = identifier
      limit 1
    )
  end;
$$;

grant execute on function public.resolve_login_identifier(text) to anon, authenticated;
