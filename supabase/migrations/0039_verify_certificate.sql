-- Public certificate verification: anyone who scans a certificate's QR code
-- hits /verify/<issuance_id>, which calls this function to confirm authenticity
-- and show the safe public details. SECURITY DEFINER so it can read across
-- tables, but it returns ONLY non-sensitive fields (no ids, no email).
create or replace function public.verify_certificate(p_id uuid)
returns table (
  valid boolean,
  student_name text,
  course_title text,
  template_title text,
  issued_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select true,
         p.name,
         coalesce(c.title, ''),
         coalesce(t.title, ''),
         ci.issued_at
  from certificate_issuances ci
  join profiles p on p.id = ci.student_id
  left join courses c on c.id = ci.course_id
  left join certificate_templates t on t.id = ci.template_id
  where ci.id = p_id;
$$;

grant execute on function public.verify_certificate(uuid) to anon, authenticated;
