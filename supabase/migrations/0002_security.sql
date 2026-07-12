-- Research Academy — RLS + helper functions + business-rule triggers
-- Real server-side enforcement layer the prototype never had (it was a
-- pure client-side mock with no auth guards at all).

-- ── Helper functions (security definer so they can read profiles/members
--    regardless of the calling row's own RLS) ───────────────────────────
create or replace function public.current_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function public.current_status()
returns user_status
language sql stable security definer set search_path = public as $$
  select status from profiles where id = auth.uid();
$$;

-- The real second factor: a password-authenticated session with
-- role='owner' is NOT enough to touch owner-only data — every owner-gated
-- policy below calls this instead of a plain role check, so it also
-- requires a *consumed* OTP within the last 12 hours (set by the
-- verify-otp Edge Function). Without this, anyone holding just the owner's
-- password could read/write owner-only rows straight through the REST API,
-- bypassing the OTP screen entirely.
create or replace function public.is_verified_owner()
returns boolean
language sql stable security definer set search_path = public as $$
  select
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
    and exists (
      select 1 from admin_login_otps
      where user_id = auth.uid()
        and consumed = true
        and verified_at > now() - interval '12 hours'
    );
$$;
-- The frontend calls this directly (supabase.rpc) right after the OTP step
-- to decide whether to route into /owner or back to /owner-otp.
grant execute on function public.is_verified_owner() to authenticated;

create or replace function public.is_conversation_member(conv_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversation_members
    where conversation_id = conv_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin(conv_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversation_members
    where conversation_id = conv_id and user_id = auth.uid() and is_admin = true
  );
$$;

create or replace function public.teaches_course(c_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from course_teachers
    where course_id = c_id and teacher_id = auth.uid()
  );
$$;

create or replace function public.is_enrolled(c_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments
    where course_id = c_id and student_id = auth.uid()
  );
$$;

-- ── profiles: prevent self role/status escalation ───────────────────────
-- A user can rename themselves, but only an owner (or the service role,
-- which bypasses RLS/triggers entirely) can change role/status.
create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = new.id and public.current_role() is distinct from 'owner' then
    new.role := old.role;
    new.status := old.status;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_self_role_change
  before update on profiles
  for each row execute function public.prevent_self_role_change();

-- ── articles: keep likes_count in sync with article_likes rows ──────────
create or replace function public.sync_article_likes_count()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update articles set likes_count = likes_count + 1 where id = new.article_id;
    return new;
  elsif tg_op = 'DELETE' then
    update articles set likes_count = greatest(0, likes_count - 1) where id = old.article_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger article_likes_sync
  after insert or delete on article_likes
  for each row execute function public.sync_article_likes_count();

-- ── messages: enforce edit (15 min) / delete (1 hour) windows server-side,
--    not just in the UI ─────────────────────────────────────────────────
create or replace function public.enforce_message_edit_rules()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.deleted = true and old.deleted = false then
    if now() - old.created_at > interval '1 hour' then
      raise exception 'delete window (1 hour) has passed';
    end if;
    new.text := null;
    new.attachment_url := null;
    new.attachment_kind := null;
    new.attachment_name := null;
    new.reply_to_message_id := null;
  else
    -- deleted can only ever transition false -> true, never be un-set.
    new.deleted := old.deleted;
  end if;

  if new.text is distinct from old.text and old.deleted = false then
    if now() - old.created_at > interval '15 minutes' then
      raise exception 'edit window (15 minutes) has passed';
    end if;
    new.edited := true;
  end if;

  return new;
end;
$$;

create trigger messages_enforce_edit_rules
  before update on messages
  for each row execute function public.enforce_message_edit_rules();

-- ── conversation_members: enforce the DM/group business rule ────────────
-- "Students cannot DM each other directly — only teacher<->student DMs,
-- owner<->anyone DMs, and teacher-created groups are allowed."
create or replace function public.enforce_conversation_membership_rules()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  conv conversations%rowtype;
  member_count int;
  role_counts record;
begin
  select * into conv from conversations where id = new.conversation_id;

  if conv.type = 'dm' then
    select count(*) into member_count
    from conversation_members where conversation_id = new.conversation_id;

    if member_count > 2 then
      raise exception 'a dm conversation can only have 2 members';
    end if;

    if member_count = 2 then
      select
        count(*) filter (where p.role in ('teacher', 'owner')) as staff_count
      into role_counts
      from conversation_members cm
      join profiles p on p.id = cm.user_id
      where cm.conversation_id = new.conversation_id;

      if role_counts.staff_count < 1 then
        raise exception 'a dm must include at least one teacher or owner';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger conversation_members_enforce_rules
  after insert on conversation_members
  for each row execute function public.enforce_conversation_membership_rules();

-- ── Enable RLS everywhere ────────────────────────────────────────────────
alter table profiles enable row level security;
alter table courses enable row level security;
alter table course_teachers enable row level security;
alter table course_sessions enable row level security;
alter table enrollments enable row level security;
alter table payments enable row level security;
alter table course_ratings enable row level security;
alter table assignments enable row level security;
alter table assignment_targets enable row level security;
alter table submissions enable row level security;
alter table articles enable row level security;
alter table article_likes enable row level security;
alter table article_comments enable row level security;
alter table certificate_templates enable row level security;
alter table course_certificate_templates enable row level security;
alter table certificate_issuances enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table conversation_join_requests enable row level security;
alter table messages enable row level security;
alter table conversation_reads enable row level security;
alter table contact_messages enable row level security;
alter table admin_login_otps enable row level security;
alter table login_events enable row level security;

-- ── profiles ─────────────────────────────────────────────────────────────
create policy profiles_select_authenticated on profiles
  for select to authenticated using (true);
create policy profiles_insert_self on profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update_self on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_owner on profiles
  for update to authenticated using (public.is_verified_owner());

-- ── courses (public read — marketing site is anonymous) ──────────────────
create policy courses_select_public on courses
  for select to anon, authenticated using (true);
create policy courses_write_owner on courses
  for all to authenticated
  using (public.is_verified_owner())
  with check (public.is_verified_owner());

create policy course_teachers_select_public on course_teachers
  for select to anon, authenticated using (true);
create policy course_teachers_write_owner on course_teachers
  for all to authenticated
  using (public.is_verified_owner())
  with check (public.is_verified_owner());

create policy course_sessions_select on course_sessions
  for select to authenticated
  using (
    public.is_verified_owner()
    or public.teaches_course(course_id)
    or public.is_enrolled(course_id)
  );
create policy course_sessions_write_owner on course_sessions
  for all to authenticated
  using (public.is_verified_owner())
  with check (public.is_verified_owner());

-- ── enrollments (no client insert — created by the payment webhook using
--    the service role, which bypasses RLS entirely) ──────────────────────
create policy enrollments_select on enrollments
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.teaches_course(course_id)
    or public.is_verified_owner()
  );
create policy enrollments_update_progress on enrollments
  for update to authenticated
  using (public.teaches_course(course_id) or public.is_verified_owner());

-- ── payments (no client insert — service role via Stripe webhook only) ───
create policy payments_select on payments
  for select to authenticated
  using (student_id = auth.uid() or public.is_verified_owner());

-- ── course_ratings (avg/count shown publicly on course cards) ────────────
create policy course_ratings_select_public on course_ratings
  for select to anon, authenticated using (true);
create policy course_ratings_upsert_self on course_ratings
  for insert to authenticated
  with check (student_id = auth.uid() and public.current_role() = 'student');
create policy course_ratings_update_self on course_ratings
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- ── assignments / targets / submissions ───────────────────────────────────
create policy assignments_select on assignments
  for select to authenticated
  using (
    public.is_verified_owner()
    or public.teaches_course(course_id)
    or (
      target_all and public.is_enrolled(course_id)
    )
    or exists (
      select 1 from assignment_targets t
      where t.assignment_id = assignments.id and t.student_id = auth.uid()
    )
  );
create policy assignments_write on assignments
  for all to authenticated
  using (public.is_verified_owner() or public.teaches_course(course_id))
  with check (public.is_verified_owner() or public.teaches_course(course_id));

create policy assignment_targets_select on assignment_targets
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.is_verified_owner()
    or exists (
      select 1 from assignments a
      where a.id = assignment_targets.assignment_id and public.teaches_course(a.course_id)
    )
  );
create policy assignment_targets_write on assignment_targets
  for all to authenticated
  using (
    public.is_verified_owner()
    or exists (
      select 1 from assignments a
      where a.id = assignment_targets.assignment_id and public.teaches_course(a.course_id)
    )
  );

create policy submissions_select on submissions
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.is_verified_owner()
    or exists (
      select 1 from assignments a
      where a.id = submissions.assignment_id and public.teaches_course(a.course_id)
    )
  );
create policy submissions_insert_self on submissions
  for insert to authenticated with check (student_id = auth.uid());
create policy submissions_update_self on submissions
  for update to authenticated
  using (student_id = auth.uid() and status <> 'graded')
  with check (student_id = auth.uid());
create policy submissions_update_grading on submissions
  for update to authenticated
  using (
    public.is_verified_owner()
    or exists (
      select 1 from assignments a
      where a.id = submissions.assignment_id and public.teaches_course(a.course_id)
    )
  );

-- ── articles / likes / comments ───────────────────────────────────────────
create policy articles_select_public on articles
  for select to anon, authenticated using (true);
create policy articles_insert_teacher on articles
  for insert to authenticated
  with check (author_id = auth.uid() and public.current_role() = 'teacher');
create policy articles_update_author on articles
  for update to authenticated
  using (author_id = auth.uid() or public.is_verified_owner())
  with check (author_id = auth.uid() or public.is_verified_owner());
create policy articles_delete_author on articles
  for delete to authenticated
  using (author_id = auth.uid() or public.is_verified_owner());

-- Row-level visibility restricted (only the liker, the article's author, or
-- the owner can see WHO liked something) — likes_count on `articles` is
-- what the public UI reads for the visible number.
create policy article_likes_select on article_likes
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_verified_owner()
    or exists (select 1 from articles a where a.id = article_likes.article_id and a.author_id = auth.uid())
  );
create policy article_likes_toggle on article_likes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy article_comments_select_public on article_comments
  for select to anon, authenticated using (true);
create policy article_comments_insert on article_comments
  for insert to authenticated with check (author_id = auth.uid());
create policy article_comments_delete_moderation on article_comments
  for delete to authenticated
  using (author_id = auth.uid() or public.is_verified_owner());

-- ── certificates (owner-managed; a student may read only what powers
--    their own issued certificate) ────────────────────────────────────────
create policy certificate_templates_select on certificate_templates
  for select to authenticated
  using (
    public.is_verified_owner()
    or exists (
      select 1 from certificate_issuances ci
      where ci.template_id = certificate_templates.id and ci.student_id = auth.uid()
    )
  );
create policy certificate_templates_write_owner on certificate_templates
  for all to authenticated
  using (public.is_verified_owner())
  with check (public.is_verified_owner());

create policy course_cert_templates_select_owner on course_certificate_templates
  for select to authenticated using (public.is_verified_owner());
create policy course_cert_templates_write_owner on course_certificate_templates
  for all to authenticated
  using (public.is_verified_owner())
  with check (public.is_verified_owner());

create policy certificate_issuances_select on certificate_issuances
  for select to authenticated
  using (student_id = auth.uid() or public.is_verified_owner());
create policy certificate_issuances_write_owner on certificate_issuances
  for all to authenticated
  using (public.is_verified_owner())
  with check (public.is_verified_owner());

-- ── messaging ──────────────────────────────────────────────────────────
create policy conversations_select on conversations
  for select to authenticated
  using (public.is_conversation_member(id) or public.is_verified_owner());
create policy conversations_insert on conversations
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (type = 'dm' or (public.current_role() = 'teacher' or public.is_verified_owner()))
  );
create policy conversations_update_admin on conversations
  for update to authenticated
  using (public.is_group_admin(id) or public.is_verified_owner());

create policy conversation_members_select on conversation_members
  for select to authenticated
  using (public.is_conversation_member(conversation_id) or public.is_verified_owner());
create policy conversation_members_insert on conversation_members
  for insert to authenticated
  with check (
    public.is_verified_owner()
    or public.is_group_admin(conversation_id)
    or exists (
      select 1 from conversations c
      where c.id = conversation_members.conversation_id and c.created_by = auth.uid()
    )
  );
create policy conversation_members_update_admin on conversation_members
  for update to authenticated
  using (public.is_group_admin(conversation_id) or public.is_verified_owner());
create policy conversation_members_delete on conversation_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_admin(conversation_id)
    or public.is_verified_owner()
  );

create policy join_requests_select on conversation_join_requests
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_admin(conversation_id)
    or public.is_verified_owner()
  );
create policy join_requests_insert on conversation_join_requests
  for insert to authenticated
  with check (user_id = auth.uid() or requested_by = auth.uid());
create policy join_requests_delete on conversation_join_requests
  for delete to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_admin(conversation_id)
    or public.is_verified_owner()
  );

create policy messages_select on messages
  for select to authenticated
  using (public.is_conversation_member(conversation_id) or public.is_verified_owner());
create policy messages_insert on messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));
create policy messages_update_own on messages
  for update to authenticated
  using (sender_id = auth.uid());

create policy conversation_reads_select on conversation_reads
  for select to authenticated using (user_id = auth.uid());
create policy conversation_reads_upsert on conversation_reads
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── contact form (public write, owner-only read) ─────────────────────────
create policy contact_messages_insert_public on contact_messages
  for insert to anon, authenticated with check (true);
create policy contact_messages_select_owner on contact_messages
  for select to authenticated using (public.is_verified_owner());
create policy contact_messages_update_owner on contact_messages
  for update to authenticated using (public.is_verified_owner());

-- ── admin_login_otps: intentionally NO policies — only the service role
--    (Edge Functions) may touch this table, RLS-enabled with zero grants
--    denies all client access by default. ─────────────────────────────────

-- ── login_events (simple self-reported counter for the owner stat) ──────
create policy login_events_insert_self on login_events
  for insert to authenticated with check (user_id = auth.uid());
create policy login_events_select_owner on login_events
  for select to authenticated using (public.is_verified_owner());
