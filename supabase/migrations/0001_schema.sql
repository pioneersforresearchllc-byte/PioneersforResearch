-- Research Academy — core schema
-- Normalizes the prototype's data model: real foreign-key enrollment
-- (instead of course-title string matching), a real payments ledger,
-- and separate assignment/target/submission tables instead of one
-- denormalized row per (assignment, student).

create extension if not exists pgcrypto;

-- ── Enums ────────────────────────────────────────────────────────────────
create type user_role as enum ('student', 'teacher', 'owner');
create type user_status as enum ('active', 'pending', 'rejected');
create type enrollment_status as enum ('active', 'completed');
create type payment_status as enum ('pending', 'completed', 'failed');
create type submission_status as enum ('pending', 'submitted', 'graded');
create type conversation_type as enum ('dm', 'group');
create type attachment_kind as enum ('image', 'audio', 'file');

-- ── Identity ─────────────────────────────────────────────────────────────
-- One row per auth.users row. Teacher-only fields are null for other roles.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null,
  status user_status not null default 'active',
  name text not null,
  username text not null unique,
  avatar_url text,
  specialty text,
  qualification text,
  years_experience int,
  cv_text text,
  created_at timestamptz not null default now()
);
create index profiles_role_idx on profiles (role);
create index profiles_status_idx on profiles (status);

-- ── Courses ──────────────────────────────────────────────────────────────
create table courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  duration_label text not null default '',
  price_cents int not null default 0,
  original_price_cents int,
  image_url text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table course_teachers (
  course_id uuid not null references courses (id) on delete cascade,
  teacher_id uuid not null references profiles (id) on delete cascade,
  primary key (course_id, teacher_id)
);

create table course_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  title text not null,
  session_date date not null,
  session_time time not null,
  link text,
  created_at timestamptz not null default now()
);

-- Real FK relation replacing the prototype's studentsRoster.program string
-- match. Created by the Stripe webhook on successful payment.
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  student_id uuid not null references profiles (id) on delete cascade,
  progress int not null default 0 check (progress between 0 and 100),
  status enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  unique (course_id, student_id)
);

-- Real payment ledger — the prototype's "successful payment" never
-- persisted anything or enrolled anyone.
create table payments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  student_id uuid not null references profiles (id) on delete cascade,
  amount_cents int not null,
  provider text not null default 'stripe',
  provider_ref text,
  status payment_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index payments_student_idx on payments (student_id);

create table course_ratings (
  course_id uuid not null references courses (id) on delete cascade,
  student_id uuid not null references profiles (id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (course_id, student_id)
);

-- ── Assignments ──────────────────────────────────────────────────────────
create table assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  title text not null,
  due_date date not null,
  details text,
  file_url text,
  target_all boolean not null default true,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

-- Only populated when target_all = false.
create table assignment_targets (
  assignment_id uuid not null references assignments (id) on delete cascade,
  student_id uuid not null references profiles (id) on delete cascade,
  primary key (assignment_id, student_id)
);

-- One row per (assignment, student) regardless of targeting mode — created
-- lazily on first submission, or eagerly for grading visibility.
create table submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments (id) on delete cascade,
  student_id uuid not null references profiles (id) on delete cascade,
  answer_text text,
  file_url text,
  status submission_status not null default 'pending',
  grade int check (grade between 0 and 100),
  feedback text,
  submitted_at timestamptz,
  graded_at timestamptz,
  unique (assignment_id, student_id)
);

-- ── Articles ─────────────────────────────────────────────────────────────
create table articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  content text not null,
  image_url text,
  likes_count int not null default 0,
  created_at timestamptz not null default now()
);

create table article_likes (
  article_id uuid not null references articles (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

create table article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- ── Certificates ─────────────────────────────────────────────────────────
create table certificate_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  name_x numeric not null default 50,
  name_y numeric not null default 80,
  course_x numeric not null default 50,
  course_y numeric not null default 62,
  created_at timestamptz not null default now()
);

create table course_certificate_templates (
  course_id uuid not null references courses (id) on delete cascade,
  template_id uuid not null references certificate_templates (id) on delete cascade,
  primary key (course_id, template_id)
);

-- image_url is a composited PNG (template + student name + course title
-- baked in client-side via canvas) uploaded to the certificate-issuances
-- bucket at issuance time.
create table certificate_issuances (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  student_id uuid not null references profiles (id) on delete cascade,
  template_id uuid not null references certificate_templates (id) on delete cascade,
  image_url text,
  issued_at timestamptz not null default now(),
  unique (course_id, student_id, template_id)
);

-- ── Messaging ────────────────────────────────────────────────────────────
create table conversations (
  id uuid primary key default gen_random_uuid(),
  type conversation_type not null,
  name text,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create table conversation_members (
  conversation_id uuid not null references conversations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  is_admin boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table conversation_join_requests (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  requested_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id),
  text text,
  attachment_url text,
  attachment_kind attachment_kind,
  attachment_name text,
  reply_to_message_id uuid references messages (id) on delete set null,
  deleted boolean not null default false,
  edited boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on messages (conversation_id, created_at);

create table conversation_reads (
  conversation_id uuid not null references conversations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- ── Misc ─────────────────────────────────────────────────────────────────
create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Accessed only via Edge Functions with the service-role key — never
-- given a client-facing RLS policy (see 0002_security.sql).
-- verified_at (set only at successful consumption) is what
-- public.is_verified_owner() checks — a rolling re-auth window, not just
-- "this code hasn't expired yet".
create table admin_login_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- Simple counter table backing the owner dashboard's "login count" stat.
create table login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
