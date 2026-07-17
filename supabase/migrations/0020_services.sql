-- Paid services (formerly the empty "programs" section). A service is an
-- offering the platform delivers (a presentation, a data analysis), priced
-- via tiered packages the owner controls. A visitor picks a package, fills a
-- request brief, and the request lands here for the team to act on. Payment
-- is a later step, so a request starts as 'pending'.

create table services (
  id uuid primary key default gen_random_uuid(),
  -- Stable key the frontend maps to a form layout (each service asks for
  -- different things), so renaming the title never breaks the form.
  slug text not null unique,
  title text not null,
  title_en text,
  description text not null default '',
  description_en text,
  image_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table service_packages (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services (id) on delete cascade,
  title text not null,
  title_en text,
  description text,
  description_en text,
  -- null price + is_custom means "contact us" (no fixed price).
  price_cents int,
  is_custom boolean not null default false,
  sort_order int not null default 0
);
create index service_packages_service_idx on service_packages (service_id, sort_order);

create table service_requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services (id) on delete restrict,
  package_id uuid references service_packages (id) on delete set null,
  -- Requests are allowed from signed-out visitors, so this is nullable.
  user_id uuid references profiles (id) on delete set null,

  full_name text not null,
  email text not null,
  phone text not null,

  subject text not null,
  purpose text,
  target_audience text,
  -- Slide count for a presentation, sample size for an analysis, etc.
  quantity int,
  language text,

  -- Exactly one of these is required by the client (ready content to format,
  -- or a written brief of the ideas).
  content_text text,
  content_file_url text,

  brand_colors text,
  reference_url text,
  reference_file_url text,

  delivery_date date not null,
  -- Anything service-specific that doesn't warrant its own column.
  details jsonb not null default '{}'::jsonb,

  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'cancelled')),
  created_at timestamptz not null default now()
);
create index service_requests_created_idx on service_requests (created_at desc);

alter table services enable row level security;
alter table service_packages enable row level security;
alter table service_requests enable row level security;

-- Services + packages are public catalogue data: anyone may read the active
-- ones; only a verified owner may change them (that's the admin price control).
create policy services_select_all on services for select to anon, authenticated using (active or public.is_verified_owner());
create policy services_write_owner on services for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

create policy service_packages_select_all on service_packages for select to anon, authenticated using (true);
create policy service_packages_write_owner on service_packages for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

-- Anyone (including signed-out visitors) may submit a request; only the owner
-- may read or manage them, since they contain the requester's contact details.
create policy service_requests_insert_any on service_requests for insert to anon, authenticated with check (true);
create policy service_requests_select_owner on service_requests for select to authenticated
  using (public.is_verified_owner());
create policy service_requests_write_owner on service_requests for all to authenticated
  using (public.is_verified_owner()) with check (public.is_verified_owner());

grant select on services, service_packages to anon, authenticated;
grant insert on service_requests to anon, authenticated;
grant select, insert, update, delete on services, service_packages, service_requests to authenticated, service_role;

-- ── Request attachments ──────────────────────────────────────────────────
-- Private bucket: a requester (often signed out) may upload their brief /
-- data file, but only the owner can read them back, since they hold the
-- client's unpublished material.
insert into storage.buckets (id, name, public) values
  ('service-request-files', 'service-request-files', false)
on conflict (id) do nothing;

create policy service_request_files_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'service-request-files');
create policy service_request_files_read_owner on storage.objects
  for select to authenticated
  using (bucket_id = 'service-request-files' and public.is_verified_owner());

-- ── Seed the two launch services ─────────────────────────────────────────
insert into services (slug, title, title_en, description, description_en, sort_order) values
  (
    'presentation',
    'تصميم عرض تقديمي',
    'Presentation Design',
    'نصمّم لك عرضًا تقديميًا احترافيًا — سواء عندك محتوى جاهز تريد تنسيقه، أو أفكار رئيسية نبنيها من الصفر.',
    'We design a professional presentation for you — whether you have ready content to format, or just key ideas we build from scratch.',
    1
  ),
  (
    'research-data-analysis',
    'تحليل بيانات البحث',
    'Analysis of Research Data',
    'نحلّل بيانات بحثك إحصائيًا ونسلّمك النتائج والجداول والرسوم جاهزة للإدراج في بحثك مع شرح للمخرجات.',
    'We statistically analyse your research data and deliver the results, tables and figures ready to drop into your paper, with an explanation of the output.',
    2
  );

insert into service_packages (service_id, title, title_en, description, description_en, price_cents, is_custom, sort_order)
select id, 'باقة أساسية', 'Basic', 'حتى 10 شرائح', 'Up to 10 slides', 15000, false, 1 from services where slug = 'presentation'
union all
select id, 'باقة متوسطة', 'Standard', 'من 11 إلى 25 شريحة', '11–25 slides', 30000, false, 2 from services where slug = 'presentation'
union all
select id, 'باقة كبيرة', 'Large', 'من 26 إلى 50 شريحة', '26–50 slides', 50000, false, 3 from services where slug = 'presentation'
union all
select id, 'باقة مخصصة', 'Custom', 'أكثر من 50 شريحة — تواصل معنا', 'More than 50 slides — contact us', null, true, 4 from services where slug = 'presentation'
union all
select id, 'باقة أساسية', 'Basic', 'إحصاء وصفي: متوسطات، تكرارات، ورسوم بيانية', 'Descriptive statistics: means, frequencies, and charts', 20000, false, 1 from services where slug = 'research-data-analysis'
union all
select id, 'باقة متوسطة', 'Standard', 'إحصاء استدلالي: اختبارات T، ANOVA، الارتباط، كاي تربيع', 'Inferential statistics: t-tests, ANOVA, correlation, chi-square', 40000, false, 2 from services where slug = 'research-data-analysis'
union all
select id, 'باقة متقدمة', 'Advanced', 'نماذج متقدمة: انحدار متعدد، تحليل عاملي، نمذجة معادلات بنائية', 'Advanced modelling: multiple regression, factor analysis, SEM', 70000, false, 3 from services where slug = 'research-data-analysis'
union all
select id, 'باقة مخصصة', 'Custom', 'تحليل غير قياسي أو بيانات ضخمة — تواصل معنا', 'Non-standard analysis or large datasets — contact us', null, true, 4 from services where slug = 'research-data-analysis';
