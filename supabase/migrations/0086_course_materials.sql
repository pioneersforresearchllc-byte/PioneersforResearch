-- 0086: Course learning space — materials (files, videos, links, notes)
-- organised into units, per-student completion, announcements and a Q&A
-- discussion board.
--
-- Access model (mirrors course_contents / assignment-files):
--   * read  — the course's teachers, a verified owner, or an enrolled student
--             (students only see PUBLISHED materials);
--   * write — the course's teachers or a verified owner;
--   * students write only their own completion marks and discussion posts.
-- Files live in the PRIVATE bucket `course-materials` under
-- "<course-id>/<uuid>.<ext>" and are opened through short-lived signed URLs.
-- In-site notifications (the dashboard bell) are raised by security-definer
-- triggers, since `notifications` has no INSERT policy for clients.
-- Idempotent: safe to re-run.

-- ── Units (modules) ──────────────────────────────────────────────────────
create table if not exists course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists course_modules_course_idx on course_modules(course_id, position);
alter table course_modules enable row level security;

drop policy if exists course_modules_select on course_modules;
create policy course_modules_select on course_modules
  for select to authenticated
  using (public.is_verified_owner() or public.teaches_course(course_id) or public.is_enrolled(course_id));

drop policy if exists course_modules_write on course_modules;
create policy course_modules_write on course_modules
  for all to authenticated
  using (public.is_verified_owner() or public.teaches_course(course_id))
  with check (public.is_verified_owner() or public.teaches_course(course_id));

grant select, insert, update, delete on course_modules to authenticated;

-- ── Materials ────────────────────────────────────────────────────────────
create table if not exists course_materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  module_id uuid references course_modules(id) on delete set null,
  kind text not null check (kind in ('file', 'video', 'link', 'note')),
  title text not null,
  description text,
  -- kind = 'file': object path in the course-materials bucket + metadata
  file_path text,
  file_name text,
  file_size bigint,
  mime_type text,
  -- kind = 'video' | 'link': external URL (YouTube, Vimeo, Drive, …)
  url text,
  -- kind = 'note': Markdown body
  body text,
  position int not null default 0,
  published boolean not null default true,
  created_by uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists course_materials_course_idx on course_materials(course_id, module_id, position);
alter table course_materials enable row level security;

drop policy if exists course_materials_select on course_materials;
create policy course_materials_select on course_materials
  for select to authenticated
  using (
    public.is_verified_owner()
    or public.teaches_course(course_id)
    or (published and public.is_enrolled(course_id))
  );

drop policy if exists course_materials_write on course_materials;
create policy course_materials_write on course_materials
  for all to authenticated
  using (public.is_verified_owner() or public.teaches_course(course_id))
  with check (public.is_verified_owner() or public.teaches_course(course_id));

grant select, insert, update, delete on course_materials to authenticated;

-- ── Per-student completion ───────────────────────────────────────────────
create table if not exists course_material_progress (
  material_id uuid not null references course_materials(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade default auth.uid(),
  course_id uuid not null references courses(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (material_id, student_id)
);
create index if not exists course_material_progress_course_idx on course_material_progress(course_id, student_id);
alter table course_material_progress enable row level security;

drop policy if exists course_material_progress_select on course_material_progress;
create policy course_material_progress_select on course_material_progress
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.teaches_course(course_id)
    or public.is_verified_owner()
  );

-- A student marks only their own progress, only on a published material of a
-- course they are enrolled in (course_id must match the material's course).
drop policy if exists course_material_progress_insert on course_material_progress;
create policy course_material_progress_insert on course_material_progress
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and public.is_enrolled(course_id)
    and exists (
      select 1 from course_materials m
      where m.id = material_id and m.course_id = course_material_progress.course_id and m.published
    )
  );

drop policy if exists course_material_progress_delete on course_material_progress;
create policy course_material_progress_delete on course_material_progress
  for delete to authenticated
  using (student_id = auth.uid());

grant select, insert, delete on course_material_progress to authenticated;

-- ── Announcements ────────────────────────────────────────────────────────
create table if not exists course_announcements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null default auth.uid(),
  title text not null,
  body text,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists course_announcements_course_idx on course_announcements(course_id, created_at desc);
alter table course_announcements enable row level security;

drop policy if exists course_announcements_select on course_announcements;
create policy course_announcements_select on course_announcements
  for select to authenticated
  using (public.is_verified_owner() or public.teaches_course(course_id) or public.is_enrolled(course_id));

drop policy if exists course_announcements_write on course_announcements;
create policy course_announcements_write on course_announcements
  for all to authenticated
  using (public.is_verified_owner() or public.teaches_course(course_id))
  with check (public.is_verified_owner() or public.teaches_course(course_id));

grant select, insert, update, delete on course_announcements to authenticated;

-- ── Q&A discussion (questions + replies) ─────────────────────────────────
create table if not exists course_posts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  parent_id uuid references course_posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade default auth.uid(),
  body text not null check (length(trim(body)) > 0),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists course_posts_course_idx on course_posts(course_id, created_at desc);
create index if not exists course_posts_parent_idx on course_posts(parent_id);
alter table course_posts enable row level security;

drop policy if exists course_posts_select on course_posts;
create policy course_posts_select on course_posts
  for select to authenticated
  using (public.is_verified_owner() or public.teaches_course(course_id) or public.is_enrolled(course_id));

drop policy if exists course_posts_insert on course_posts;
create policy course_posts_insert on course_posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (public.is_verified_owner() or public.teaches_course(course_id) or public.is_enrolled(course_id))
  );

-- Authors edit their own posts; staff can mark questions resolved / moderate.
drop policy if exists course_posts_update on course_posts;
create policy course_posts_update on course_posts
  for update to authenticated
  using (author_id = auth.uid() or public.teaches_course(course_id) or public.is_verified_owner())
  with check (author_id = auth.uid() or public.teaches_course(course_id) or public.is_verified_owner());

drop policy if exists course_posts_delete on course_posts;
create policy course_posts_delete on course_posts
  for delete to authenticated
  using (author_id = auth.uid() or public.teaches_course(course_id) or public.is_verified_owner());

grant select, insert, update, delete on course_posts to authenticated;

-- ── Storage: private course-materials bucket ─────────────────────────────
insert into storage.buckets (id, name, public)
values ('course-materials', 'course-materials', false)
on conflict (id) do nothing;

drop policy if exists course_materials_files_read on storage.objects;
create policy course_materials_files_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'course-materials'
    and (
      public.teaches_course(((storage.foldername(name))[1])::uuid)
      or public.is_enrolled(((storage.foldername(name))[1])::uuid)
      or public.is_verified_owner()
    )
  );

drop policy if exists course_materials_files_write on storage.objects;
create policy course_materials_files_write on storage.objects
  for all to authenticated
  using (
    bucket_id = 'course-materials'
    and (public.teaches_course(((storage.foldername(name))[1])::uuid) or public.is_verified_owner())
  )
  with check (
    bucket_id = 'course-materials'
    and (public.teaches_course(((storage.foldername(name))[1])::uuid) or public.is_verified_owner())
  );

-- ── Notifications (dashboard bell) ───────────────────────────────────────
-- New published material / announcement → every enrolled student.
create or replace function public.notify_course_students(p_course_id uuid, p_kind text, p_title text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, kind, title, body, url)
  select e.student_id, p_kind, p_title, p_body, '/student/courses/' || p_course_id::text
  from enrollments e
  where e.course_id = p_course_id;
exception when undefined_table then
  null; -- notifications not migrated yet; never block the write
end; $$;
revoke all on function public.notify_course_students(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.trg_course_material_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_course text;
begin
  if not new.published then return new; end if;
  if tg_op = 'UPDATE' and old.published then return new; end if;
  select title into v_course from courses where id = new.course_id;
  perform public.notify_course_students(
    new.course_id, 'course_material',
    'محتوى جديد في ' || coalesce(v_course, 'دورتك'),
    new.title
  );
  return new;
end; $$;

drop trigger if exists trg_course_material_notify on course_materials;
create trigger trg_course_material_notify
  after insert or update of published on course_materials
  for each row execute function public.trg_course_material_notify();

create or replace function public.trg_course_announcement_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_course text;
begin
  select title into v_course from courses where id = new.course_id;
  perform public.notify_course_students(
    new.course_id, 'course_announcement',
    'إعلان جديد: ' || coalesce(v_course, 'دورتك'),
    new.title
  );
  return new;
end; $$;

drop trigger if exists trg_course_announcement_notify on course_announcements;
create trigger trg_course_announcement_notify
  after insert on course_announcements
  for each row execute function public.trg_course_announcement_notify();

-- Discussion: a new question → the course's teachers; a reply → the
-- question's author (unless they replied to themselves).
create or replace function public.trg_course_post_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_course text;
  v_parent_author uuid;
begin
  select title into v_course from courses where id = new.course_id;
  begin
    if new.parent_id is null then
      insert into notifications (user_id, kind, title, body, url)
      select ct.teacher_id, 'course_question',
             'سؤال جديد في ' || coalesce(v_course, 'الدورة'),
             left(new.body, 140),
             '/teacher/courses/' || new.course_id::text
      from course_teachers ct
      where ct.course_id = new.course_id and ct.teacher_id <> new.author_id;
    else
      select author_id into v_parent_author from course_posts where id = new.parent_id;
      if v_parent_author is not null and v_parent_author <> new.author_id then
        insert into notifications (user_id, kind, title, body, url)
        select v_parent_author, 'course_reply',
               'رد جديد على سؤالك في ' || coalesce(v_course, 'الدورة'),
               left(new.body, 140),
               case when p.role = 'student' then '/student/courses/' else '/teacher/courses/' end || new.course_id::text
        from profiles p where p.id = v_parent_author;
      end if;
    end if;
  exception when undefined_table then
    null;
  end;
  return new;
end; $$;

drop trigger if exists trg_course_post_notify on course_posts;
create trigger trg_course_post_notify
  after insert on course_posts
  for each row execute function public.trg_course_post_notify();

-- Check
select 'course_modules' as object, count(*) from information_schema.tables where table_name = 'course_modules'
union all select 'course_materials', count(*) from information_schema.tables where table_name = 'course_materials'
union all select 'course_material_progress', count(*) from information_schema.tables where table_name = 'course_material_progress'
union all select 'course_announcements', count(*) from information_schema.tables where table_name = 'course_announcements'
union all select 'course_posts', count(*) from information_schema.tables where table_name = 'course_posts'
union all select 'bucket course-materials', count(*) from storage.buckets where id = 'course-materials';
