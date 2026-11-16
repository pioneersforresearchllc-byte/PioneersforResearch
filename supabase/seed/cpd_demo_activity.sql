-- Demo CPD activity for the SCFHS (Mustamir) review.
--
-- Creates one free, self-enrollable CPD activity with: full CPD details, a
-- 3-question assessment (quiz), and two live sessions (one past, one upcoming)
-- so attendance can be demonstrated, plus an always-open check-in session.
-- Run AFTER migrations 0090, 0091, 0092 and 0093.
--
-- Idempotent: fixed UUID, upserts — safe to re-run. To remove the demo later:
--   delete from public.courses where id = '0cbd0a01-0000-4000-8000-000000000001';
-- (quiz, sessions, enrolments, attempts and evaluations cascade.)
--
-- Run in the Supabase SQL editor. This is NOT a migration; it only seeds data.

-- 1) The activity (free so the SCFHS reviewer can self-enrol as a learner).
insert into public.courses (id, title, description, duration_label, price_cents, completed, cpd)
values (
  '0cbd0a01-0000-4000-8000-000000000001',
  'نشاط تجريبي: أساسيات الممارسة المبنية على الدليل في الرعاية الصحية',
  'نشاط تعليمي تجريبي يوضّح رحلة التعلّم الكاملة في المنصّة: المحتوى العلمي، والاختبار، وتسجيل الحضور، ونموذج التقييم. مُعدّ لغرض مراجعة الهيئة السعودية للتخصصات الصحية.',
  'ساعتان تعليميتان (تجريبي)',
  0,
  false,
  jsonb_build_object(
    'audience', 'الأطباء والممرضون والصيادلة وأخصائيو العلوم الصحية التطبيقية والباحثون في المجال الصحي — مستوى مبتدئ إلى متوسط.',
    'objectives',
      'يشرح المشارك مفهوم الممارسة المبنية على الدليل وخطواتها الخمس.' || chr(10) ||
      'يصوغ سؤالًا بحثيًا منظّمًا بصيغة PICO.' || chr(10) ||
      'يميّز بين مستويات الأدلة ومصادرها الموثوقة.',
    'outcomes',
      'القدرة على تحويل مشكلة سريرية إلى سؤال قابل للبحث.' || chr(10) ||
      'القدرة على تقييم جودة الدليل قبل تطبيقه.',
    'topics',
      'المحور الأول: مفهوم الممارسة المبنية على الدليل وخطواتها الخمس.' || chr(10) ||
      'المحور الثاني: صياغة السؤال السريري بصيغة PICO.' || chr(10) ||
      'المحور الثالث: البحث في قواعد البيانات والمصادر العلمية الموثوقة.' || chr(10) ||
      'المحور الرابع: مستويات الأدلة والتقييم النقدي للدراسات.' || chr(10) ||
      'المحور الخامس: تطبيق الدليل في الممارسة وتقييم الأثر.',
    'methods', 'محاضرات تفاعلية مباشرة بالفيديو، ودراسات حالة، وتمارين تطبيقية، ونقاش جماعي وأسئلة، ومحتوى ذاتي (عروض تقديمية ومراجع PDF ومقاطع فيديو).',
    'assessment', 'اختبار بعدي بنسبة نجاح 70%، وإكمال نموذج تقييم النشاط، وحضور 80% من الجلسات المباشرة.',
    'hours', '',
    'accreditationNo', '',
    'sponsorship', '',
    'speakers', jsonb_build_array(
      jsonb_build_object(
        'name', 'المتحدث التجريبي الأول',
        'credentials', 'استشاري/باحث — (بيانات تجريبية)',
        'disclosure', 'لا توجد لديّ أي علاقة مالية ذات صلة بأي جهة تجارية.'
      )
    )
  )
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  duration_label = excluded.duration_label,
  price_cents = excluded.price_cents,
  cpd = excluded.cpd;

-- 2) The assessment (correct answers stay server-side; pass mark 70%).
insert into public.course_quizzes (course_id, pass_mark, questions)
values (
  '0cbd0a01-0000-4000-8000-000000000001',
  70,
  jsonb_build_array(
    jsonb_build_object(
      'prompt', 'ما أول خطوة في الممارسة المبنية على الدليل؟',
      'options', jsonb_build_array('صياغة سؤال سريري قابل للبحث', 'نشر النتائج', 'كتابة التوصيات', 'جمع التبرّعات'),
      'correct', 0
    ),
    jsonb_build_object(
      'prompt', 'ماذا يمثّل حرف P في صيغة PICO؟',
      'options', jsonb_build_array('الدواء', 'المريض أو المشكلة (Patient/Problem)', 'الناشر', 'الاحتمال'),
      'correct', 1
    ),
    jsonb_build_object(
      'prompt', 'أيّ المصادر التالية يُعدّ من أعلى مستويات الأدلة؟',
      'options', jsonb_build_array('رأي خبير منفرد', 'تقرير حالة', 'المراجعة المنهجية والتحليل البَعدي', 'مدوّنة شخصية'),
      'correct', 2
    )
  )
)
on conflict (course_id) do update set
  pass_mark = excluded.pass_mark,
  questions = excluded.questions,
  updated_at = now();

-- 3) Two live sessions: one already held (for attendance), one upcoming.
insert into public.course_sessions (id, course_id, title, session_date, session_time, link)
values
  ('0cbd0a01-0000-4000-8000-0000000000a1', '0cbd0a01-0000-4000-8000-000000000001',
   'الجلسة الأولى: مدخل إلى الممارسة المبنية على الدليل', current_date - 7, '19:00', null),
  ('0cbd0a01-0000-4000-8000-0000000000a2', '0cbd0a01-0000-4000-8000-000000000001',
   'الجلسة الثانية: صياغة السؤال وتقييم الدليل', current_date + 7, '19:00', null)
on conflict (id) do update set
  title = excluded.title, session_date = excluded.session_date, session_time = excluded.session_time;

-- 4) Demo session whose self check-in link stays open (migration 0093), so the
--    reviewer can try the direct attendance link /attend/<id> at any time.
insert into public.course_sessions (id, course_id, title, session_date, session_time, link, checkin_always_open)
values
  ('0cbd0a01-0000-4000-8000-0000000000a3', '0cbd0a01-0000-4000-8000-000000000001',
   'جلسة تجريبية لتجربة تسجيل الحضور (رابط الحضور مفتوح دائمًا للعرض)', current_date, '19:00', null, true)
on conflict (id) do update set
  title = excluded.title, checkin_always_open = true;

-- 5) Demo review accounts created from Owner -> Admins -> "SCFHS review
--    accounts" (usernames cpd_teacher_* / cpd_student_*): assign the lecturers
--    to the activity and enrol the learners, so every role opens a populated
--    activity. Re-run this file after creating new demo accounts.
insert into public.course_teachers (course_id, teacher_id)
select '0cbd0a01-0000-4000-8000-000000000001', p.id
  from public.profiles p
 where p.role = 'teacher' and p.username like 'cpd\_teacher\_%'
on conflict do nothing;

insert into public.enrollments (course_id, student_id)
select '0cbd0a01-0000-4000-8000-000000000001', p.id
  from public.profiles p
 where p.role = 'student' and p.username like 'cpd\_student\_%'
on conflict (course_id, student_id) do nothing;

-- 6) In-platform video conference for the demo lectures. Live lectures join a
--    built-in Daily room (/group-call/<id>, the same engine as workshops): the
--    admin and the demo lecturer open the room as host; an enrolled demo
--    learner (signed up below) joins and waits to be admitted. Dates are kept
--    ~6 weeks ahead so the lectures stay "upcoming" (join button visible) for
--    the whole review.
insert into public.group_sessions (id, title, description, scheduled_at, duration_min, capacity, host_id, status, is_private)
values (
  '0cbd0a01-0000-4000-8000-0000000000b1',
  'غرفة المؤتمر المرئي للنشاط التجريبي (الممارسة المبنية على الدليل)',
  'مؤتمر فيديو وصوت داخل المنصة مع مشاركة الشاشة والدردشة. يدخل المسؤول أو المحاضر كمضيف، ويدخل المتعلم المسجّل ثم يقبله المضيف.',
  ((current_date + 45) + time '19:00') at time zone 'Asia/Riyadh',
  120,
  30,
  (select p.id from public.profiles p
    where p.role = 'teacher' and p.username like 'cpd\_teacher\_%' order by p.created_at limit 1),
  'scheduled',
  true
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  scheduled_at = excluded.scheduled_at,
  duration_min = excluded.duration_min,
  host_id = coalesce(excluded.host_id, public.group_sessions.host_id),
  status = 'scheduled',
  is_private = true,
  -- a new date needs a fresh room (Daily rooms expire after the session)
  daily_room_name = null,
  daily_room_url = null;

insert into public.group_session_signups (session_id, user_id)
select '0cbd0a01-0000-4000-8000-0000000000b1', p.id
  from public.profiles p
 where p.role = 'student' and p.username like 'cpd\_student\_%'
on conflict do nothing;

update public.course_sessions
   set link = 'https://pioneersresearch.com/group-call/0cbd0a01-0000-4000-8000-0000000000b1',
       session_date = case id
         when '0cbd0a01-0000-4000-8000-0000000000a2' then current_date + 45
         when '0cbd0a01-0000-4000-8000-0000000000a3' then current_date + 44
       end
 where id in ('0cbd0a01-0000-4000-8000-0000000000a2', '0cbd0a01-0000-4000-8000-0000000000a3');

-- Check.
select 'course' as object, count(*) from public.courses where id = '0cbd0a01-0000-4000-8000-000000000001'
union all
select 'quiz questions', jsonb_array_length(questions) from public.course_quizzes where course_id = '0cbd0a01-0000-4000-8000-000000000001'
union all
select 'sessions', count(*) from public.course_sessions where course_id = '0cbd0a01-0000-4000-8000-000000000001';
