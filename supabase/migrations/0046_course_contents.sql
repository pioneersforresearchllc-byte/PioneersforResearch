-- Rich HTML course content. The owner can paste a full, self-contained HTML
-- lesson (styles + scripts) for a course. It lives in its own table — NOT on
-- the public `courses` row — so paid / code-only course content is readable
-- only by people who actually have access: enrolled students, the course's
-- teachers, or a verified owner. The client renders it inside a sandboxed
-- iframe (allow-scripts, NO same-origin), so the pasted script runs isolated
-- from the app and the user's session.

create table if not exists course_contents (
  course_id uuid primary key references courses(id) on delete cascade,
  content_html text,
  updated_at timestamptz not null default now()
);

alter table course_contents enable row level security;

-- Read: enrolled students, the course's teachers, or a verified owner.
drop policy if exists course_contents_select on course_contents;
create policy course_contents_select on course_contents
  for select to authenticated
  using (
    public.is_verified_owner()
    or public.teaches_course(course_id)
    or exists (
      select 1 from enrollments e
      where e.course_id = course_contents.course_id and e.student_id = auth.uid()
    )
  );

-- Create / update / delete: verified owner only.
drop policy if exists course_contents_write on course_contents;
create policy course_contents_write on course_contents
  for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

grant select, insert, update, delete on course_contents to authenticated;
