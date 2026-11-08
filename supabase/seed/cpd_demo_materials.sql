-- Learning content for the demo CPD activity (SCFHS / Mustamir review).
--
-- Adds one unit to the demo activity created by cpd_demo_activity.sql, with
-- two written lessons and three links to trusted scientific sources, so the
-- reviewer can browse and complete content as a learner.
-- Run AFTER cpd_demo_activity.sql (and migration 0086).
--
-- Idempotent: fixed UUIDs, upserts - safe to re-run. Remove with:
--   delete from public.course_modules where id = '0cbd0a01-0000-4000-8000-0000000000b1';
--   delete from public.course_materials where course_id = '0cbd0a01-0000-4000-8000-000000000001'
--     and id::text like '0cbd0a01-0000-4000-8000-0000000000c%';
--
-- Videos, PDFs and slides are uploaded from the platform (activity space ->
-- content) because files live in storage, not in SQL.

-- 1) The unit.
insert into public.course_modules (id, course_id, title, description, position)
values (
  '0cbd0a01-0000-4000-8000-0000000000b1',
  '0cbd0a01-0000-4000-8000-000000000001',
  'الوحدة الأولى: أساسيات الممارسة المبنية على الدليل',
  'مفهوم الممارسة المبنية على الدليل وخطواتها، وصياغة السؤال السريري بصيغة PICO، ومستويات الأدلة.',
  0
)
on conflict (id) do update set
  title = excluded.title, description = excluded.description, position = excluded.position;

-- 2) Materials.
insert into public.course_materials (id, course_id, module_id, kind, title, description, url, body, position, published)
values
  (
    '0cbd0a01-0000-4000-8000-0000000000c1',
    '0cbd0a01-0000-4000-8000-000000000001',
    '0cbd0a01-0000-4000-8000-0000000000b1',
    'note',
    'الدرس 1: ما الممارسة المبنية على الدليل؟',
    'درس مكتوب - 10 دقائق قراءة',
    null,
    '## ما الممارسة المبنية على الدليل؟' || chr(10) || chr(10) ||
    'هي دمج **أفضل الأدلة البحثية المتاحة** مع **الخبرة السريرية** للممارس و**قيم المريض وتفضيلاته** عند اتخاذ القرار الصحي.' || chr(10) || chr(10) ||
    '### الخطوات الخمس' || chr(10) || chr(10) ||
    '1. **السؤال (Ask):** تحويل المشكلة السريرية إلى سؤال قابل للبحث.' || chr(10) ||
    '2. **البحث (Acquire):** البحث عن أفضل دليل في المصادر الموثوقة.' || chr(10) ||
    '3. **التقييم (Appraise):** تقييم صحة الدليل وأهميته وقابليته للتطبيق.' || chr(10) ||
    '4. **التطبيق (Apply):** دمج الدليل مع الخبرة السريرية وتفضيلات المريض.' || chr(10) ||
    '5. **التقويم (Assess):** قياس النتائج ومراجعة الأداء.' || chr(10) || chr(10) ||
    '**نشاط تطبيقي:** اختر موقفًا سريريًا واجهته مؤخرًا، واكتب كيف كانت ستختلف خطوات قرارك لو اتبعت الخطوات الخمس، ثم شاركه في تبويب «الأسئلة والنقاش».',
    0,
    true
  ),
  (
    '0cbd0a01-0000-4000-8000-0000000000c2',
    '0cbd0a01-0000-4000-8000-000000000001',
    '0cbd0a01-0000-4000-8000-0000000000b1',
    'note',
    'الدرس 2: صياغة السؤال السريري بصيغة PICO',
    'درس مكتوب مع مثال تطبيقي',
    null,
    '## صيغة PICO' || chr(10) || chr(10) ||
    '- **P - المريض أو المشكلة (Patient/Problem):** من المرضى المعنيون؟' || chr(10) ||
    '- **I - التدخل (Intervention):** ما الإجراء أو العلاج المقترح؟' || chr(10) ||
    '- **C - المقارنة (Comparison):** بماذا نقارنه؟' || chr(10) ||
    '- **O - النتيجة (Outcome):** ما النتيجة التي نقيسها؟' || chr(10) || chr(10) ||
    '### مثال' || chr(10) || chr(10) ||
    'لدى البالغين المصابين بالسكري من النوع الثاني (P)، هل يؤدي برنامج التثقيف الصحي المنظّم (I) مقارنة بالرعاية المعتادة (C) إلى خفض مستوى الهيموغلوبين السكري HbA1c (O)؟' || chr(10) || chr(10) ||
    '**تمرين:** صُغ سؤالًا بصيغة PICO من مجال ممارستك، ثم ابحث عنه في PubMed من الرابط في هذه الوحدة.',
    1,
    true
  ),
  (
    '0cbd0a01-0000-4000-8000-0000000000c3',
    '0cbd0a01-0000-4000-8000-000000000001',
    '0cbd0a01-0000-4000-8000-0000000000b1',
    'link',
    'مستويات الأدلة - مركز الطب المبني على الدليل بجامعة أكسفورد (OCEBM)',
    'مرجع لتصنيف مستويات الأدلة العلمية.',
    'https://www.cebm.ox.ac.uk/resources/levels-of-evidence/ocebm-levels-of-evidence',
    null,
    2,
    true
  ),
  (
    '0cbd0a01-0000-4000-8000-0000000000c4',
    '0cbd0a01-0000-4000-8000-000000000001',
    '0cbd0a01-0000-4000-8000-0000000000b1',
    'link',
    'مكتبة كوكرين (Cochrane Library) للمراجعات المنهجية',
    'مصدر موثوق للمراجعات المنهجية في الرعاية الصحية.',
    'https://www.cochranelibrary.com/',
    null,
    3,
    true
  ),
  (
    '0cbd0a01-0000-4000-8000-0000000000c5',
    '0cbd0a01-0000-4000-8000-000000000001',
    '0cbd0a01-0000-4000-8000-0000000000b1',
    'link',
    'قاعدة بيانات PubMed',
    'للبحث عن الدراسات المنشورة بعد صياغة سؤال PICO.',
    'https://pubmed.ncbi.nlm.nih.gov/',
    null,
    4,
    true
  )
on conflict (id) do update set
  module_id = excluded.module_id,
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  url = excluded.url,
  body = excluded.body,
  position = excluded.position,
  published = excluded.published,
  updated_at = now();

-- Check.
select 'modules' as object, count(*) from public.course_modules where course_id = '0cbd0a01-0000-4000-8000-000000000001'
union all
select 'materials', count(*) from public.course_materials where course_id = '0cbd0a01-0000-4000-8000-000000000001';
