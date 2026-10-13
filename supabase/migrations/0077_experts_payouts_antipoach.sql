-- 0077: experts (teachers) — specialties, payouts, notifications, anti-poaching.
--   (1) expert_profiles: what each expert can deliver (services, fields,
--       languages) + their default share — owner-managed.
--   (2) request_payouts: what the expert earns per request; "mark paid"
--       records it as a teacher_fees expense in one step. Kept OUT of
--       service_requests so students can never see what the expert earns.
--   (3) Alerts (via notify-owner, migration 0068): the expert is notified
--       the moment a request is assigned to them; the owner is notified the
--       moment the work is finished (time to issue the final invoice).
--   (4) Anti-poaching: phone numbers, emails and outside links are masked in
--       every chat message from a teacher or student, and the owner is
--       alerted; teachers and students can only message each other when they
--       actually work together (an assigned request or a course).
-- Idempotent: safe to re-run.

-- ── (1) Expert profiles ──────────────────────────────────────────────────
create table if not exists public.expert_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  service_ids uuid[] not null default '{}',
  fields text not null default '',
  languages text not null default '',
  share_percent int not null default 50 check (share_percent between 0 and 100),
  notes text,
  updated_at timestamptz not null default now()
);
alter table public.expert_profiles enable row level security;
drop policy if exists expert_profiles_owner on public.expert_profiles;
create policy expert_profiles_owner on public.expert_profiles
  for all to authenticated using (public.is_verified_owner()) with check (public.is_verified_owner());
-- Owner-only on purpose: the notes and share are private to the owner.
drop policy if exists expert_profiles_self_read on public.expert_profiles;

-- ── (2) Payouts ─────────────────────────────────────────────────────────
create table if not exists public.request_payouts (
  request_id uuid primary key references public.service_requests(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents int not null check (amount_cents >= 0),
  paid_at timestamptz,
  expense_id uuid references public.expenses(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.request_payouts enable row level security;
drop policy if exists request_payouts_owner on public.request_payouts;
create policy request_payouts_owner on public.request_payouts
  for all to authenticated using (public.is_verified_owner()) with check (public.is_verified_owner());
drop policy if exists request_payouts_self_read on public.request_payouts;
create policy request_payouts_self_read on public.request_payouts
  for select to authenticated using (teacher_id = auth.uid());

-- Owner pays the expert: records the expense and marks the payout paid together.
create or replace function public.mark_payout_paid(p_request uuid, p_method text default 'bank')
returns void language plpgsql security definer set search_path = public as $$
declare
  po request_payouts%rowtype;
  t_name text;
  subj text;
  exp_id uuid;
begin
  if not public.is_verified_owner() then raise exception 'not allowed'; end if;
  select * into po from request_payouts where request_id = p_request for update;
  if not found then raise exception 'no payout set for this request'; end if;
  if po.paid_at is not null then return; end if;
  if po.amount_cents <= 0 then raise exception 'payout amount is zero'; end if;
  select name into t_name from profiles where id = po.teacher_id;
  select coalesce(nullif(subject, ''), full_name) into subj from service_requests where id = p_request;
  insert into expenses (spent_on, category, description, amount_cents, method, created_by)
  values (current_date, 'teacher_fees', left(format('مستحقات %s — %s', coalesce(t_name, ''), coalesce(subj, '')), 300),
          po.amount_cents, case when p_method in ('bank', 'cash', 'card') then p_method else 'bank' end, auth.uid())
  returning id into exp_id;
  update request_payouts set paid_at = now(), expense_id = exp_id, updated_at = now() where request_id = p_request;
end; $$;
grant execute on function public.mark_payout_paid(uuid, text) to authenticated;

-- ── (3) Assignment / work-done timestamps + alerts ──────────────────────
alter table public.service_requests add column if not exists assigned_at timestamptz;
alter table public.service_requests add column if not exists work_done_at timestamptz;

create or replace function public.stamp_service_request_times()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.assigned_teacher_id is distinct from old.assigned_teacher_id then
    new.assigned_at := case when new.assigned_teacher_id is null then null else now() end;
  else
    new.assigned_at := old.assigned_at;
  end if;
  if new.status in ('awaiting_final', 'done') and old.status not in ('awaiting_final', 'done') then
    new.work_done_at := now();
  else
    new.work_done_at := old.work_done_at;
  end if;
  return new;
end; $$;
drop trigger if exists service_requests_stamp_times on public.service_requests;
create trigger service_requests_stamp_times
  before update on public.service_requests
  for each row execute function public.stamp_service_request_times();

drop trigger if exists trg_alert_assigned on public.service_requests;
create trigger trg_alert_assigned
  after update of assigned_teacher_id on public.service_requests
  for each row when (new.assigned_teacher_id is not null and new.assigned_teacher_id is distinct from old.assigned_teacher_id)
  execute function public.notify_owner_alert('assigned');

drop trigger if exists trg_alert_work_done on public.service_requests;
create trigger trg_alert_work_done
  after update of status on public.service_requests
  for each row when (new.status in ('awaiting_final', 'done') and old.status = 'in_progress')
  execute function public.notify_owner_alert('work_done');

-- ── (4a) Mask contact details in chats ──────────────────────────────────
create table if not exists public.contact_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  source text not null,
  ref_id uuid,
  original text,
  masked boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.contact_flags enable row level security;
drop policy if exists contact_flags_owner_read on public.contact_flags;
create policy contact_flags_owner_read on public.contact_flags
  for select to authenticated using (public.is_verified_owner());

create or replace function public.mask_contacts(p text)
returns text language plpgsql immutable set search_path = public as $$
declare
  token constant text := '[🔒 وسيلة تواصل محجوبة — التواصل داخل المنصة فقط]';
  s text := translate(p, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789');
  m text[];
  digits text;
begin
  -- emails
  s := regexp_replace(s, '[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\.[A-Za-z]{2,}', token, 'g');
  -- social / messaging links, with or without http
  s := regexp_replace(s, '(https?://)?(www\.)?(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me|telegram\.me|instagram\.com|snapchat\.com|linkedin\.com|facebook\.com|fb\.com|x\.com|twitter\.com|tiktok\.com)\S*', token, 'gi');
  -- any other link, except the platform and meeting tools
  for m in select regexp_matches(s, '((https?://|www\.)\S+)', 'gi') loop
    if m[1] !~* '(pioneersresearch\.com|meet\.google\.com|zoom\.us|teams\.microsoft\.com|teams\.live\.com)' then
      s := replace(s, m[1], token);
    end if;
  end loop;
  -- phone numbers (9–15 digits, international or local prefix; dates/years don't match)
  for m in select regexp_matches(s, '((\+|00)?[0-9][0-9 ().-]{7,}[0-9])', 'g') loop
    digits := regexp_replace(m[1], '\D', '', 'g');
    if length(digits) between 9 and 15
       and (m[1] ~ '^(\+|00)' or digits ~ '^(05|5[0-9]{8}$|966|971|965|974|973|968|20|249|962|01)') then
      s := replace(s, m[1], token);
    end if;
  end loop;
  return s;
end; $$;

create or replace function public.guard_chat_contacts()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  sender_role text;
  sender_username text;
  masked text;
  hint boolean;
  ref uuid;
begin
  if new.text is null or new.text = '' then return new; end if;
  if tg_op = 'UPDATE' and new.text is not distinct from old.text then return new; end if;
  select role::text, username into sender_role, sender_username from profiles where id = new.sender_id;
  -- The owner and the platform's own AI assistant may share the company's contacts.
  if sender_role is null or sender_role = 'owner' or sender_username = 'ai-assistant' then return new; end if;

  masked := public.mask_contacts(new.text);
  hint := new.text ~* '(واتس|وتس|whats ?app|تيليجرام|تلغرام|telegram|سناب|snap ?chat|انستا|insta|رقمي|رقم جوالي|جوالي|ايميلي|إيميلي|my number|خارج المنصة|برا المنصة|بدون المنصة)';
  if masked is distinct from new.text or hint then
    ref := coalesce((to_jsonb(new) ->> 'request_id')::uuid, (to_jsonb(new) ->> 'conversation_id')::uuid);
    insert into contact_flags (user_id, source, ref_id, original, masked)
    values (new.sender_id, tg_table_name, ref, left(new.text, 500), masked is distinct from new.text);
    new.text := masked;
  end if;
  return new;
end; $$;

drop trigger if exists service_messages_guard_contacts on public.service_messages;
create trigger service_messages_guard_contacts
  before insert or update of text on public.service_messages
  for each row execute function public.guard_chat_contacts();

drop trigger if exists messages_guard_contacts on public.messages;
create trigger messages_guard_contacts
  before insert or update of text on public.messages
  for each row execute function public.guard_chat_contacts();

drop trigger if exists trg_alert_contact_flag on public.contact_flags;
create trigger trg_alert_contact_flag
  after insert on public.contact_flags
  for each row execute function public.notify_owner_alert('contact_flag');

-- ── (4b) Teachers ↔ students only when they actually work together ──────
create or replace function public.teacher_student_related(p_teacher uuid, p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from service_requests where assigned_teacher_id = p_teacher and user_id = p_student)
      or exists (
        select 1 from enrollments e join course_teachers ct on ct.course_id = e.course_id
        where ct.teacher_id = p_teacher and e.student_id = p_student
      );
$$;

-- Who the caller may start a chat with (null = no restriction, i.e. owner).
create or replace function public.my_chat_contact_ids()
returns setof uuid language plpgsql stable security definer set search_path = public as $$
declare
  my_role text;
begin
  select role::text into my_role from profiles where id = auth.uid();
  if my_role = 'teacher' then
    return query
      select user_id from service_requests where assigned_teacher_id = auth.uid() and user_id is not null
      union
      select e.student_id from enrollments e join course_teachers ct on ct.course_id = e.course_id where ct.teacher_id = auth.uid();
  elsif my_role = 'student' then
    return query
      select assigned_teacher_id from service_requests where user_id = auth.uid() and assigned_teacher_id is not null
      union
      select ct.teacher_id from enrollments e join course_teachers ct on ct.course_id = e.course_id where e.student_id = auth.uid()
      union
      select id from profiles where username = 'ai-assistant';
  end if;
end; $$;
grant execute on function public.my_chat_contact_ids() to authenticated;

create or replace function public.enforce_teacher_student_link()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  conv conversations%rowtype;
  new_role text;
  new_username text;
  o record;
begin
  select * into conv from conversations where id = new.conversation_id;
  -- Groups the owner creates are the owner's business.
  if exists (select 1 from profiles where id = conv.created_by and role = 'owner') then return new; end if;
  select role::text, username into new_role, new_username from profiles where id = new.user_id;
  if new_role not in ('teacher', 'student') or new_username = 'ai-assistant' then return new; end if;

  for o in
    select p.id, p.role::text as role, p.username
    from conversation_members cm join profiles p on p.id = cm.user_id
    where cm.conversation_id = new.conversation_id and cm.user_id <> new.user_id
  loop
    if o.username = 'ai-assistant' then continue; end if;
    if new_role = 'teacher' and o.role = 'student' and not public.teacher_student_related(new.user_id, o.id) then
      raise exception 'teacher_student_not_related';
    elsif new_role = 'student' and o.role = 'teacher' and not public.teacher_student_related(o.id, new.user_id) then
      raise exception 'teacher_student_not_related';
    end if;
  end loop;
  return new;
end; $$;

drop trigger if exists conversation_members_teacher_student_link on public.conversation_members;
create trigger conversation_members_teacher_student_link
  after insert on public.conversation_members
  for each row execute function public.enforce_teacher_student_link();

-- Check: should list 7 rows.
select trigger_name from information_schema.triggers
where trigger_name in ('service_requests_stamp_times', 'trg_alert_assigned', 'trg_alert_work_done',
  'service_messages_guard_contacts', 'messages_guard_contacts', 'trg_alert_contact_flag',
  'conversation_members_teacher_student_link')
group by trigger_name order by 1;
