// send-enrollment-email — emails a student a confirmation when they enrol in a
// course, with the lecture schedule and a direct link to their dashboard.
// Called by a database trigger (migration 0084) on every enrolment (free, paid
// or code), guarded by the shared x-hook-secret. Reuses the existing SMTP_*
// secrets; no new secrets needed. Deploy with --no-verify-jwt.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SMTPClient } from '../_shared/smtp.ts'

function firstFromJsonDict(raw: string | undefined): string {
  if (!raw) return ''
  try {
    const values = Object.values(JSON.parse(raw)) as string[]
    return values[0] ?? ''
  } catch {
    return raw
  }
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY =
  firstFromJsonDict(Deno.env.get('SUPABASE_SECRET_KEYS')) || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const HOOK_SECRET = Deno.env.get('XAPI_HOOK_SECRET') || ''
const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.zoho.com'
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') || '465')
const SMTP_USER = Deno.env.get('SMTP_USER')
const SMTP_PASS = Deno.env.get('SMTP_PASS')
const SMTP_FROM = Deno.env.get('SMTP_FROM') || SMTP_USER || ''
const SITE = 'https://www.pioneersresearch.com'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  if (!HOOK_SECRET || (req.headers.get('x-hook-secret') || '') !== HOOK_SECRET) return json({ error: 'forbidden' }, 403)

  let body: { course_id?: string; student_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  if (!body.course_id || !body.student_id) return json({ error: 'missing course_id/student_id' }, 400)

  try {
    return await handle(body.course_id, body.student_id)
  } catch (err) {
    console.error('send-enrollment-email failed', err)
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

async function handle(courseId: string, studentId: string): Promise<Response> {
  if (!SMTP_USER || !SMTP_PASS) return json({ ok: false, error: 'smtp not configured' })

  const { data: profile } = await admin.from('profiles').select('name').eq('id', studentId).maybeSingle()
  const { data: authUser } = await admin.auth.admin.getUserById(studentId)
  const email = authUser?.user?.email
  if (!email) return json({ ok: true, skipped: 'no_email' })
  const name = profile?.name || 'عميلنا العزيز'

  const { data: course } = await admin
    .from('courses')
    .select('title, description, duration_label')
    .eq('id', courseId)
    .maybeSingle()
  if (!course) return json({ error: 'course not found' }, 404)

  const { data: sessions } = await admin
    .from('course_sessions')
    .select('title, session_date, session_time')
    .eq('course_id', courseId)
    .order('session_date', { ascending: true })
    .order('session_time', { ascending: true })

  const rows = (sessions ?? [])
    .map(
      (s) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eef1f5;color:#0b1f3a">${esc(String(s.title))}</td>` +
        `<td style="padding:8px 12px;border-bottom:1px solid #eef1f5;color:#44566b;white-space:nowrap">${esc(String(s.session_date))} · ${esc(String(s.session_time).slice(0, 5))}</td></tr>`,
    )
    .join('')
  const scheduleHtml = rows
    ? `<table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:14px"><thead><tr>` +
      `<th style="text-align:right;padding:8px 12px;background:#f4f6fa;color:#0b1f3a">المحاضرة</th>` +
      `<th style="text-align:right;padding:8px 12px;background:#f4f6fa;color:#0b1f3a">الموعد</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<p style="color:#44566b;font-size:14px">سيصلك جدول المحاضرات قريبًا.</p>'

  const loginUrl = `${SITE}/login?redirect=/student/courses`
  const subject = `تأكيد التسجيل في «${course.title}»`
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;background:#f4f6fa;font-family:'Segoe UI',Tahoma,Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#0b1f3a;border-radius:14px 14px 0 0;padding:22px 26px;text-align:center">
    <div style="color:#ffffff;font-size:18px;font-weight:700">الرواد الاستشارية للبحوث الصحية</div>
  </div>
  <div style="background:#ffffff;border:1px solid #eef1f5;border-top:none;border-radius:0 0 14px 14px;padding:26px">
    <p style="color:#0b1f3a;font-size:16px;margin:0 0 10px">مرحبًا ${esc(name)}،</p>
    <p style="color:#44566b;font-size:14px;line-height:1.9;margin:0 0 6px">
      تم تسجيلك بنجاح في <b style="color:#0b1f3a">«${esc(course.title)}»</b>${
        course.duration_label ? ` (${esc(course.duration_label)})` : ''
      }. يسعدنا انضمامك، وبالتوفيق في رحلتك التدريبية.
    </p>
    <div style="color:#0b1f3a;font-size:15px;font-weight:700;margin:18px 0 4px">جدول المحاضرات</div>
    ${scheduleHtml}
    <div style="text-align:center;margin:22px 0 6px">
      <a href="${loginUrl}" style="display:inline-block;background:#1aa851;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 34px;border-radius:999px">الدخول إلى الدورة</a>
    </div>
    <p style="color:#8a98ab;font-size:12px;line-height:1.8;margin:16px 0 0">
      للدخول للمحاضرة في وقتها: سجّل الدخول ثم افتح «دوراتي». لأي استفسار راسلنا على support@pioneersresearch.com.
    </p>
  </div>
  <p style="text-align:center;color:#8a98ab;font-size:12px;margin:14px 0 0">pioneersresearch.com</p>
</div></body></html>`

  const text =
    `مرحبًا ${name},\n\nتم تسجيلك بنجاح في «${course.title}».\n\n` +
    (sessions ?? []).map((s) => `- ${s.title}: ${s.session_date} ${String(s.session_time).slice(0, 5)}`).join('\n') +
    `\n\nالدخول إلى الدورة: ${loginUrl}\n\nالرواد الاستشارية للبحوث الصحية · pioneersresearch.com`

  const client = new SMTPClient({
    connection: { hostname: SMTP_HOST, port: SMTP_PORT, tls: SMTP_PORT === 465, auth: { username: SMTP_USER, password: SMTP_PASS } },
  })
  try {
    await client.send({ from: SMTP_FROM, to: email, subject, content: text, html })
  } finally {
    await client.close()
  }
  return json({ ok: true })
}
