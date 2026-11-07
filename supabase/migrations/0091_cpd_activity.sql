-- 0091: SCFHS CPD activity features — per-activity assessment (quiz),
-- learner evaluation/feedback form, and the learner's own attendance view.
--
-- Builds on 0090 (courses.cpd, practitioner_info) and 0071 (session_attendance).
--
-- 1) course_quizzes — the assessment questions + pass mark for a CPD activity.
--    Owner/teacher-only table: the CORRECT answers never leave the server.
--    Learners interact only through two SECURITY DEFINER RPCs:
--      • cpd_get_quiz(course)      → questions WITHOUT the correct answers
--      • cpd_submit_quiz(course,…) → grades server-side, stores the attempt,
--                                     returns the score + which were right.
-- 2) quiz_attempts — one row per learner submission (score, pass/fail).
-- 3) course_evaluations — the learner's activity-satisfaction + speaker
--    evaluation (one upsertable row per learner per activity).
--
-- Idempotent: safe to re-run. Frontend is deploy-safe before this runs
-- (every reader tolerates the missing table / RPC and shows a "not ready" note
-- only to staff).

-- ── 1. Quiz definition (owner / course teacher only) ───────────────────────
create table if not exists public.course_quizzes (
  course_id uuid primary key references public.courses (id) on delete cascade,
  pass_mark int not null default 60 check (pass_mark between 0 and 100),
  -- [{ "prompt": text, "options": [text,…], "correct": int (0-based) }, …]
  questions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.course_quizzes enable row level security;

drop policy if exists course_quizzes_read_staff on public.course_quizzes;
create policy course_quizzes_read_staff on public.course_quizzes
  for select to authenticated
  using (public.is_verified_owner() or public.teaches_course(course_id));

drop policy if exists course_quizzes_write_staff on public.course_quizzes;
create policy course_quizzes_write_staff on public.course_quizzes
  for all to authenticated
  using (public.is_verified_owner() or public.teaches_course(course_id))
  with check (public.is_verified_owner() or public.teaches_course(course_id));

grant select, insert, update, delete on public.course_quizzes to authenticated;

-- ── 2. Quiz attempts ───────────────────────────────────────────────────────
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  score int not null check (score between 0 and 100),
  passed boolean not null default false,
  answers jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now()
);
create index if not exists quiz_attempts_course_idx on public.quiz_attempts (course_id);
create index if not exists quiz_attempts_student_idx on public.quiz_attempts (student_id);
alter table public.quiz_attempts enable row level security;

-- Learner sees their own attempts; owner / course teacher sees everyone's.
-- Rows are only ever created through cpd_submit_quiz (security definer), so
-- there is no INSERT policy for clients.
drop policy if exists quiz_attempts_select on public.quiz_attempts;
create policy quiz_attempts_select on public.quiz_attempts
  for select to authenticated
  using (student_id = auth.uid() or public.is_verified_owner() or public.teaches_course(course_id));

grant select on public.quiz_attempts to authenticated;

-- Questions for a learner, WITHOUT the correct answers. Readable by an enrolled
-- learner, the course teacher, or the owner (so a reviewer can preview it).
drop function if exists public.cpd_get_quiz(uuid);
create function public.cpd_get_quiz(p_course_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_quiz public.course_quizzes%rowtype;
begin
  if not (
    public.is_verified_owner()
    or public.teaches_course(p_course_id)
    or exists (select 1 from enrollments e where e.course_id = p_course_id and e.student_id = auth.uid())
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v_quiz from course_quizzes where course_id = p_course_id;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'pass_mark', v_quiz.pass_mark,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object('prompt', e->>'prompt', 'options', e->'options'))
      from jsonb_array_elements(v_quiz.questions) e
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.cpd_get_quiz(uuid) from public, anon;
grant execute on function public.cpd_get_quiz(uuid) to authenticated;

-- Grade a submission server-side, store it, return the result. p_answers is a
-- JSON array of the chosen 0-based option index per question (null = skipped).
drop function if exists public.cpd_submit_quiz(uuid, jsonb);
create function public.cpd_submit_quiz(p_course_id uuid, p_answers jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_quiz public.course_quizzes%rowtype;
  v_total int;
  v_correct int := 0;
  v_score int;
  v_passed boolean;
  i int;
  v_q jsonb;
begin
  if not (
    public.is_verified_owner()
    or public.teaches_course(p_course_id)
    or exists (select 1 from enrollments e where e.course_id = p_course_id and e.student_id = auth.uid())
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v_quiz from course_quizzes where course_id = p_course_id;
  if not found then
    raise exception 'no quiz';
  end if;

  v_total := jsonb_array_length(v_quiz.questions);
  if v_total = 0 then
    raise exception 'no questions';
  end if;

  for i in 0 .. v_total - 1 loop
    v_q := v_quiz.questions -> i;
    if (p_answers -> i) is not null
       and jsonb_typeof(p_answers -> i) = 'number'
       and (p_answers ->> i)::int = (v_q ->> 'correct')::int then
      v_correct := v_correct + 1;
    end if;
  end loop;

  v_score := round(v_correct * 100.0 / v_total);
  v_passed := v_score >= v_quiz.pass_mark;

  insert into quiz_attempts (course_id, student_id, score, passed, answers)
  values (p_course_id, auth.uid(), v_score, v_passed, coalesce(p_answers, '[]'::jsonb));

  return jsonb_build_object('score', v_score, 'passed', v_passed, 'correct', v_correct, 'total', v_total, 'pass_mark', v_quiz.pass_mark);
end;
$$;
revoke execute on function public.cpd_submit_quiz(uuid, jsonb) from public, anon;
grant execute on function public.cpd_submit_quiz(uuid, jsonb) to authenticated;

-- ── 3. Learner evaluation / feedback ───────────────────────────────────────
create table if not exists public.course_evaluations (
  course_id uuid not null references public.courses (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  -- aspect → 1..5 (objectives_met, content_relevance, methods, organization, overall)
  ratings jsonb not null default '{}'::jsonb,
  -- [{ "name": text, "knowledge": 1..5, "delivery": 1..5, "comment": text }, …]
  speakers jsonb not null default '[]'::jsonb,
  would_recommend boolean,
  comments text check (comments is null or char_length(comments) <= 4000),
  submitted_at timestamptz not null default now(),
  primary key (course_id, student_id)
);
alter table public.course_evaluations enable row level security;

drop policy if exists course_evaluations_select on public.course_evaluations;
create policy course_evaluations_select on public.course_evaluations
  for select to authenticated
  using (student_id = auth.uid() or public.is_verified_owner() or public.teaches_course(course_id));

drop policy if exists course_evaluations_insert on public.course_evaluations;
create policy course_evaluations_insert on public.course_evaluations
  for insert to authenticated
  with check (student_id = auth.uid());

drop policy if exists course_evaluations_update on public.course_evaluations;
create policy course_evaluations_update on public.course_evaluations
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

grant select, insert, update on public.course_evaluations to authenticated;

-- Check.
select 'course_quizzes' as object, count(*) from information_schema.tables where table_name = 'course_quizzes'
union all
select 'quiz_attempts', count(*) from information_schema.tables where table_name = 'quiz_attempts'
union all
select 'course_evaluations', count(*) from information_schema.tables where table_name = 'course_evaluations'
union all
select 'cpd_get_quiz', count(*) from pg_proc where proname = 'cpd_get_quiz'
union all
select 'cpd_submit_quiz', count(*) from pg_proc where proname = 'cpd_submit_quiz';
