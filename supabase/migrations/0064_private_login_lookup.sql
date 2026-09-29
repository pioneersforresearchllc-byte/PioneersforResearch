-- 0064: stop leaking account emails from usernames.
--
-- resolve_login_identifier(identifier) (0004) returned the email for ANY
-- username to anonymous callers, so anyone who knew a username could read the
-- account's email. It is replaced by:
--   * resolve_login(p_identifier, p_password): returns the email only when the
--     password is correct for that account (bcrypt check against auth.users),
--     with a per-IP failure limit so it can't be used to brute-force passwords.
--   * is_username_taken(p_username): boolean availability check for sign-up.
-- The old function stays for the service role but anon/authenticated lose it.
-- Idempotent: safe to re-run.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.login_lookup_failures (
  id bigserial primary key,
  ip text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);
create index if not exists login_lookup_failures_ip_idx on public.login_lookup_failures (ip, created_at);
alter table public.login_lookup_failures enable row level security;
-- No policies: only the security-definer function below touches this table.

create or replace function public.resolve_login(p_identifier text, p_password text)
returns jsonb
language plpgsql volatile security definer set search_path = public, auth, extensions as $$
declare
  v_ident text := trim(coalesce(p_identifier, ''));
  v_ip text;
  v_fails int;
  v_email text;
  r record;
begin
  -- An email needs no lookup (and reveals nothing new); GoTrue checks the password.
  if v_ident like '%@%' then
    return jsonb_build_object('email', v_ident);
  end if;

  v_ip := coalesce(
    nullif(current_setting('request.headers', true)::json ->> 'cf-connecting-ip', ''),
    nullif(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), ''),
    'unknown'
  );

  select count(*) into v_fails from login_lookup_failures
  where ip = v_ip and created_at > now() - interval '15 minutes';
  if v_fails >= 10 then
    return jsonb_build_object('error', 'rate_limited');
  end if;

  -- Case-insensitive match; if two accounts differ only by case, the password decides.
  for r in
    select u.email, u.encrypted_password from profiles p
    join auth.users u on u.id = p.id
    where lower(p.username) = lower(v_ident)
  loop
    if r.encrypted_password is not null and r.encrypted_password <> ''
       and r.encrypted_password = crypt(coalesce(p_password, ''), r.encrypted_password) then
      v_email := r.email;
      exit;
    end if;
  end loop;

  if v_email is null then
    insert into login_lookup_failures (ip, identifier) values (v_ip, left(v_ident, 100));
    delete from login_lookup_failures where created_at < now() - interval '1 day';
    return jsonb_build_object('error', 'invalid');
  end if;
  return jsonb_build_object('email', v_email);
end;
$$;

grant execute on function public.resolve_login(text, text) to anon, authenticated;

create or replace function public.is_username_taken(p_username text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where lower(p.username) = lower(trim(p_username)));
$$;

grant execute on function public.is_username_taken(text) to anon, authenticated;

revoke execute on function public.resolve_login_identifier(text) from anon, authenticated, public;
