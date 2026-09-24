// Emails an issued invoice to the billed student as a formatted (official)
// invoice, from the company address. Reuses the same SMTP_* secrets as the
// login OTP mail (point them at Zoho / support@pioneersresearch.com to send
// from the company inbox). Owner-gated; best-effort (the invoice already
// exists in the DB whether or not this delivers).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

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
const ANON_KEY = firstFromJsonDict(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')) || Deno.env.get('SUPABASE_ANON_KEY')!
const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com'
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') || '465')
const SMTP_USER = Deno.env.get('SMTP_USER')
const SMTP_PASS = Deno.env.get('SMTP_PASS')
const SMTP_FROM = Deno.env.get('SMTP_FROM') || SMTP_USER || ''

const IDENTITY = {
  nameAr: 'شركة بايونيرز هيلث ريسيرتش كونسالتينج (ذ.م.م)',
  nameEn: 'Pioneers Health Research Consulting LLC',
  unified: '7055175363',
  tax: '3150160068',
  misa: '24926274626',
  address: 'JHJA8230',
}
const LOGO_URL = 'https://pioneersresearch.com/logo.png'
const SITE_URL = 'https://pioneersresearch.com'
const BILLING_PATH = '/student/billing'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}

function sar(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ر.س'
}
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function invoiceHtml(inv: {
  id: string
  title: string
  description: string | null
  amount_cents: number
  created_at: string
  studentName: string
  bank: string
}): string {
  const num = `INV-${inv.id.slice(0, 8).toUpperCase()}`
  const date = new Intl.DateTimeFormat('ar-u-ca-gregory', { dateStyle: 'long', timeZone: 'Asia/Riyadh' }).format(
    new Date(inv.created_at),
  )
  const payUrl = `${SITE_URL}/login?redirect=${encodeURIComponent(BILLING_PATH)}`
  const bankBlock = inv.bank
    ? `<tr><td style="padding:0 22px"><div style="margin-top:16px;padding:12px 14px;background:#f6f8fb;border:1px solid #e6ebf2;border-radius:10px;font-size:13px;color:#0b1f3a;white-space:pre-wrap">${esc(inv.bank)}</div></td></tr>`
    : ''
  // Light background + dark text throughout so mobile dark-mode engines don't
  // hide text on a colored block. A full document lets us set color-scheme.
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light only"/>
<meta name="supported-color-schemes" content="light only"/>
</head>
<body style="margin:0;background:#eef1f5;padding:20px 0;font-family:Tahoma,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e6ebf2;border-radius:14px;overflow:hidden;color:#0b1f3a">
    <tr><td style="height:5px;background:#0b1f3a;font-size:0;line-height:0">&nbsp;</td></tr>
    <tr><td style="padding:18px 22px;border-bottom:1px solid #eef1f5">
      <table role="presentation" width="100%"><tr>
        <td style="vertical-align:top">
          <img src="${LOGO_URL}" width="42" height="42" alt="" style="vertical-align:middle;border-radius:8px"/>
          <span style="font-weight:bold;font-size:15px;color:#0b1f3a;margin-inline-start:8px">${IDENTITY.nameAr}</span>
          <div style="font-size:11px;color:#6b7787;margin-top:6px">الرقم الموحّد: ${IDENTITY.unified} · الرقم الضريبي: ${IDENTITY.tax}</div>
          <div style="font-size:11px;color:#6b7787">رخصة الاستثمار: ${IDENTITY.misa} · العنوان الوطني: ${IDENTITY.address}</div>
        </td>
        <td style="vertical-align:top;text-align:left;white-space:nowrap">
          <div style="font-weight:bold;font-size:14px;color:#0b1f3a">فاتورة</div>
          <div style="font-size:11px;color:#6b7787;margin-top:4px" dir="ltr">${num}</div>
          <div style="font-size:11px;color:#6b7787">${date}</div>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:16px 22px 4px">
      <span style="color:#6b7787;font-size:13px">فاتورة إلى:</span> <b style="font-size:13px">${esc(inv.studentName || '—')}</b>
    </td></tr>
    <tr><td style="padding:8px 22px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px">
        <tr style="background:#f6f8fb;color:#6b7787">
          <th style="text-align:right;padding:8px 10px;border:1px solid #e6ebf2">البند</th>
          <th style="text-align:left;padding:8px 10px;border:1px solid #e6ebf2">المبلغ</th>
        </tr>
        <tr>
          <td style="padding:10px;border:1px solid #e6ebf2;color:#0b1f3a">
            <b>${esc(inv.title)}</b>${inv.description ? `<div style="color:#6b7787;font-size:12px;margin-top:3px">${esc(inv.description)}</div>` : ''}
          </td>
          <td style="padding:10px;border:1px solid #e6ebf2;text-align:left;white-space:nowrap;color:#0b1f3a">${sar(inv.amount_cents)}</td>
        </tr>
        <tr>
          <td style="padding:10px;border:1px solid #e6ebf2;font-weight:bold">الإجمالي المستحق</td>
          <td style="padding:10px;border:1px solid #e6ebf2;text-align:left;white-space:nowrap;font-weight:bold;font-size:15px">${sar(inv.amount_cents)}</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding:18px 22px 4px" align="center">
      <a href="${payUrl}" style="display:inline-block;background:#1aa851;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 26px;border-radius:10px">عرض الفاتورة والدفع</a>
    </td></tr>
    <tr><td style="padding:14px 22px 0;font-size:13px;font-weight:bold">طريقة الدفع — تحويل بنكي</td></tr>
    ${bankBlock}
    <tr><td style="padding:14px 22px 22px;color:#8a94a3;font-size:11.5px;text-align:center">بعد التحويل، افتح الرابط أعلاه (سجّل الدخول إن لزم) وارفع صورة الإيصال في «الفواتير المستحقة» لتأكيد الدفع.</td></tr>
  </table>
  </td></tr></table>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'missing authorization' }, 401)

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()
  if (userErr || !user) return json({ error: 'unauthorized' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!caller || caller.role !== 'owner') return json({ error: 'not an owner account' }, 403)

  let body: { invoiceId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  if (!body.invoiceId) return json({ error: 'missing invoiceId' }, 400)

  const { data: inv } = await admin
    .from('student_invoices')
    .select('id, user_id, title, description, amount_cents, created_at')
    .eq('id', body.invoiceId)
    .maybeSingle()
  if (!inv) return json({ error: 'invoice not found' }, 404)

  const { data: student } = await admin.from('profiles').select('name').eq('id', inv.user_id as string).maybeSingle()
  const { data: authUser } = await admin.auth.admin.getUserById(inv.user_id as string)
  const to = authUser?.user?.email
  if (!to) return json({ error: 'no student email' }, 422)

  const { data: bankRow } = await admin.from('site_content').select('value_ar, value_en').eq('key', 'bank.details').maybeSingle()
  const bank = (bankRow?.value_ar || bankRow?.value_en || '') as string

  const html = invoiceHtml({
    id: inv.id as string,
    title: inv.title as string,
    description: (inv.description as string) ?? null,
    amount_cents: inv.amount_cents as number,
    created_at: inv.created_at as string,
    studentName: (student?.name as string) || '',
    bank,
  })

  if (!SMTP_USER || !SMTP_PASS) return json({ error: 'smtp not configured', sent: false }, 200)

  const num = `INV-${(inv.id as string).slice(0, 8).toUpperCase()}`
  const client = new SMTPClient({
    connection: { hostname: SMTP_HOST, port: SMTP_PORT, tls: SMTP_PORT === 465, auth: { username: SMTP_USER, password: SMTP_PASS } },
  })
  try {
    await client.send({
      from: SMTP_FROM,
      to,
      subject: `Pioneers Health Research - Invoice ${num}`,
      content: `فاتورة ${num} من بايونيرز للأبحاث الصحية. الإجمالي المستحق: ${sar(inv.amount_cents as number)}.`,
      html,
    })
    return json({ sent: true })
  } catch (err) {
    console.error('send-invoice-email failed', err)
    return json({ error: String(err), sent: false }, 200)
  } finally {
    try {
      await client.close()
    } catch {
      // ignore
    }
  }
})
