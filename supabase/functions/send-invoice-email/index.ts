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
  const bankBlock = inv.bank
    ? `<div style="margin-top:16px;padding:12px 14px;background:#f6f8fb;border:1px solid #e6ebf2;border-radius:10px;font-size:13px;color:#0b1f3a;white-space:pre-wrap">${esc(inv.bank)}</div>`
    : ''
  return `
  <div style="max-width:600px;margin:0 auto;font-family:Tahoma,Arial,sans-serif;color:#0b1f3a" dir="rtl">
    <div style="background:linear-gradient(90deg,#12325c,#0b1f3a);color:#fff;border-radius:12px 12px 0 0;padding:18px 20px;display:flex;justify-content:space-between;gap:12px">
      <div style="display:flex;gap:12px;align-items:center">
        <img src="${LOGO_URL}" width="44" height="44" alt="" style="background:#fff;border-radius:8px;padding:3px"/>
        <div>
          <div style="font-weight:bold;font-size:15px">${IDENTITY.nameAr}</div>
          <div style="font-size:11px;color:#c9d6ea;margin-top:3px">الرقم الموحّد: ${IDENTITY.unified} · الرقم الضريبي: ${IDENTITY.tax}</div>
          <div style="font-size:11px;color:#c9d6ea">رخصة الاستثمار: ${IDENTITY.misa} · العنوان الوطني: ${IDENTITY.address}</div>
        </div>
      </div>
      <div style="text-align:left">
        <div style="font-weight:bold;font-size:13px">فاتورة</div>
        <div style="font-size:11px;color:#c9d6ea;margin-top:4px" dir="ltr">${num}</div>
        <div style="font-size:11px;color:#c9d6ea">${date}</div>
      </div>
    </div>
    <div style="border:1px solid #e6ebf2;border-top:0;border-radius:0 0 12px 12px;padding:18px 20px">
      <div style="font-size:13px;margin-bottom:12px"><span style="color:#6b7787">فاتورة إلى:</span> <b>${esc(inv.studentName || '—')}</b></div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f6f8fb;color:#6b7787">
            <th style="text-align:right;padding:8px 10px;border:1px solid #e6ebf2">البند</th>
            <th style="text-align:left;padding:8px 10px;border:1px solid #e6ebf2">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:10px;border:1px solid #e6ebf2">
              <b>${esc(inv.title)}</b>${inv.description ? `<div style="color:#6b7787;font-size:12px;margin-top:3px">${esc(inv.description)}</div>` : ''}
            </td>
            <td style="padding:10px;border:1px solid #e6ebf2;text-align:left;white-space:nowrap">${sar(inv.amount_cents)}</td>
          </tr>
        </tbody>
      </table>
      <div style="margin-top:12px;margin-inline-start:auto;max-width:280px;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #e6ebf2;font-weight:bold;font-size:15px"><span>الإجمالي المستحق</span><span>${sar(inv.amount_cents)}</span></div>
      </div>
      <div style="margin-top:14px;font-size:13px;font-weight:bold">طريقة الدفع — تحويل بنكي</div>
      ${bankBlock}
      <div style="margin-top:16px;color:#8a94a3;font-size:11.5px;text-align:center">بعد التحويل، يُرجى رفع صورة الإيصال من حسابك في قسم «الفواتير المستحقة» لتأكيد الدفع.</div>
    </div>
  </div>`
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
