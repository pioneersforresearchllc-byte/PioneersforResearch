-- Human-readable certificate serial (e.g. PHR-2026-00042) printed on the
-- certificate and shown on the verification page. Backed by a sequence so it's
-- unique and monotonic regardless of who issues.
create sequence if not exists certificate_serial start 1;

alter table certificate_issuances add column if not exists cert_number text;

create or replace function public.next_certificate_number()
returns text language sql volatile security definer set search_path = public as $$
  select 'PHR-' || extract(year from now())::int || '-' || lpad(nextval('certificate_serial')::text, 5, '0');
$$;
grant execute on function public.next_certificate_number() to authenticated;

-- Verification now also returns the readable number.
create or replace function public.verify_certificate(p_id uuid)
returns table (
  valid boolean,
  student_name text,
  course_title text,
  template_title text,
  cert_number text,
  issued_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select true,
         p.name,
         coalesce(c.title, ''),
         coalesce(t.title, ''),
         coalesce(ci.cert_number, ''),
         ci.issued_at
  from certificate_issuances ci
  join profiles p on p.id = ci.student_id
  left join courses c on c.id = ci.course_id
  left join certificate_templates t on t.id = ci.template_id
  where ci.id = p_id;
$$;
grant execute on function public.verify_certificate(uuid) to anon, authenticated;
