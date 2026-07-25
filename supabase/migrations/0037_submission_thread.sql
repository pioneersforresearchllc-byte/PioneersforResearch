-- Threaded discussion on a submission: teacher and student exchange messages
-- (with optional file attachments) back and forth, plus unseen counters that
-- drive the notification badges on the "Assignments" / "Review" tabs.

create table if not exists submission_messages (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text,
  file_url text,   -- object path in the private 'submission-files' bucket
  file_name text,  -- original filename, for display only
  created_at timestamptz not null default now()
);
create index if not exists submission_messages_submission_idx
  on submission_messages(submission_id, created_at);

alter table submissions add column if not exists teacher_unseen int not null default 0;
alter table submissions add column if not exists student_unseen int not null default 0;

alter table submission_messages enable row level security;

-- Participants of a submission's thread: the student who owns it, any teacher
-- of the assignment's course, or a verified owner.
drop policy if exists submission_messages_select on submission_messages;
create policy submission_messages_select on submission_messages
  for select to authenticated
  using (
    exists (select 1 from submissions s where s.id = submission_id and s.student_id = auth.uid())
    or exists (
      select 1 from submissions s
      join assignments a on a.id = s.assignment_id
      where s.id = submission_id and public.teaches_course(a.course_id)
    )
    or public.is_verified_owner()
  );

drop policy if exists submission_messages_insert on submission_messages;
create policy submission_messages_insert on submission_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      exists (select 1 from submissions s where s.id = submission_id and s.student_id = auth.uid())
      or exists (
        select 1 from submissions s
        join assignments a on a.id = s.assignment_id
        where s.id = submission_id and public.teaches_course(a.course_id)
      )
      or public.is_verified_owner()
    )
  );

-- Bump the *other* party's unseen counter whenever a message is posted.
create or replace function public.bump_submission_unseen()
returns trigger
language plpgsql security definer set search_path = public as $$
declare s_student uuid;
begin
  select student_id into s_student from submissions where id = new.submission_id;
  if new.sender_id = s_student then
    update submissions set teacher_unseen = teacher_unseen + 1 where id = new.submission_id;
  else
    update submissions set student_unseen = student_unseen + 1 where id = new.submission_id;
  end if;
  return new;
end; $$;

drop trigger if exists trg_submission_unseen on submission_messages;
create trigger trg_submission_unseen
  after insert on submission_messages
  for each row execute function public.bump_submission_unseen();

-- Reset the caller's side of the counter when they open the thread.
create or replace function public.mark_submission_thread_seen(p_submission uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare s_student uuid; c_id uuid;
begin
  select s.student_id, a.course_id into s_student, c_id
    from submissions s join assignments a on a.id = s.assignment_id
    where s.id = p_submission;
  if s_student = auth.uid() then
    update submissions set student_unseen = 0 where id = p_submission;
  elsif public.teaches_course(c_id) or public.is_verified_owner() then
    update submissions set teacher_unseen = 0 where id = p_submission;
  end if;
end; $$;

-- Badge counts (aggregated across all the caller's submissions).
create or replace function public.my_student_unseen_submissions()
returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(student_unseen), 0)::int from submissions where student_id = auth.uid();
$$;

create or replace function public.my_teacher_unseen_submissions()
returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(s.teacher_unseen), 0)::int
  from submissions s
  join assignments a on a.id = s.assignment_id
  where public.teaches_course(a.course_id);
$$;

grant execute on function public.mark_submission_thread_seen(uuid) to authenticated;
grant execute on function public.my_student_unseen_submissions() to authenticated;
grant execute on function public.my_teacher_unseen_submissions() to authenticated;

-- Thread attachments live under 'thread/<submission_id>/<file>' in the existing
-- private submission-files bucket. Unlike student submission files (keyed by the
-- student's own folder), these must be readable/writable by BOTH parties, so
-- they get submission-scoped policies instead of the per-uid folder rule.
drop policy if exists submission_thread_files_read on storage.objects;
create policy submission_thread_files_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'submission-files'
    and (storage.foldername(name))[1] = 'thread'
    and exists (
      select 1 from submissions s
      join assignments a on a.id = s.assignment_id
      where s.id::text = (storage.foldername(name))[2]
        and (s.student_id = auth.uid() or public.teaches_course(a.course_id) or public.is_verified_owner())
    )
  );

drop policy if exists submission_thread_files_write on storage.objects;
create policy submission_thread_files_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'submission-files'
    and (storage.foldername(name))[1] = 'thread'
    and exists (
      select 1 from submissions s
      join assignments a on a.id = s.assignment_id
      where s.id::text = (storage.foldername(name))[2]
        and (s.student_id = auth.uid() or public.teaches_course(a.course_id) or public.is_verified_owner())
    )
  );
