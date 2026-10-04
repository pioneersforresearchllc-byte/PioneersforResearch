// Payment reminders for unpaid student invoices.
//
// Two ways in:
//   1. Automatic — pg_cron (migration 0069) POSTs {} once a day. Every invoice
//      still 'unpaid', at least 2 days old, whose last reminder was 2+ days ago
//      and that has had fewer than MAX_AUTO automatic reminders gets one.
//      Calling this path again early does nothing (the 2-day gate), so it is
//      deployed with Verify JWT OFF and needs no secret.
//   2. Manual — the owner's "remind now" button POSTs { invoiceId } with their
//      session. Only a verified owner may do this; it skips the 2-day gate but
//      refuses if a reminder went out in the last hour (double-click guard).
//
// Each reminder: email (with amount, bank details and a link to pay/upload the
// receipt) + an in-app notification (dashboard bell) to the student.
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
const SITE_URL = (Deno.env.get('SITE_URL') || 'https://pioneersresearch.com').trim().replace(/\/+$/, '')


const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com'
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') || '465')
const SMTP_USER = Deno.env.get('SMTP_USER')
const SMTP_PASS = Deno.env.get('SMTP_PASS')
const SMTP_FROM = Deno.env.get('SMTP_FROM') || SMTP_USER || ''

const DAY = 24 * 60 * 60 * 1000
const GAP_MS = 2 * DAY - 60 * 60 * 1000 // "every 2 days", tolerant of cron drift
const MAX_AUTO = 6
const MANUAL_COOLDOWN_MS = 60 * 60 * 1000

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}

const sar = (cents: number) => `${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س`

type Admin = ReturnType<typeof createClient>
interface Invoice {
  id: string
  user_id: string
  title: string
  amount_cents: number
  created_at: string
  reminder_count: number
  last_reminded_at: string | null
}

function reminderHtml(inv: Invoice, name: string, bank: string, nth: number) {
  const num = `INV-${inv.id.slice(0, 8).toUpperCase()}`
  const days = Math.max(1, Math.floor((Date.now() - new Date(inv.created_at).getTime()) / DAY))
  const bankBlock = bank
    ? `<div style="margin-top:16px;padding:12px 14px;background:#f6f8fb;border:1px solid #e6ebf2;border-radius:10px;font-size:13px;line-height:1.9;color:#1f2d3d;white-space:pre-line">${bank.replace(/</g, '&lt;')}</div>`
    : ''
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;background:#eef2f7;font-family:Tahoma,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0b1f3a;padding:20px 22px;color:#fff">
<div style="font-size:18px;font-weight:bold">Pioneers Health Research</div>
<div style="font-size:12px;color:#c9a24b;margin-top:4px">تذكير بسداد فاتورة${nth > 1 ? ` (${nth})` : ''}</div></td></tr>
<tr><td style="padding:22px;color:#1f2d3d;font-size:14px;line-height:1.9">
<p style="margin:0 0 10px">مرحبًا ${name ? name.replace(/</g, '&lt;') : ''}،</p>
<p style="margin:0 0 14px">نذكّرك بأن الفاتورة التالية ما زالت بانتظار السداد منذ ${days} يوم:</p>
<div style="border:1px solid #e6ebf2;border-radius:12px;padding:14px 16px">
<div style="font-size:13px;color:#6b7a8c">${num}</div>
<div style="font-size:15px;font-weight:bold;margin:4px 0">${inv.title.replace(/</g, '&lt;')}</div>
<div style="font-size:20px;font-weight:bold;color:#0b1f3a">${sar(inv.amount_cents)}</div></div>
${bankBlock}
<p style="margin:16px 0 0">بعد التحويل، ارفع صورة الإيصال من لوحتك ليبدأ العمل فورًا:</p>
<p style="margin:14px 0 0;text-align:center"><a href="${SITE_URL}/student/invoices" style="display:inline-block;background:#c9a24b;color:#0b1f3a;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:999px">عرض الفاتورة ورفع الإيصال</a></p>
<p style="margin:18px 0 0;font-size:12px;color:#8a97a8">إذا كنت قد سددت بالفعل، يرجى رفع الإيصال أو تجاهل هذه الرسالة.</p>
</td></tr></table></td></tr></table></body></html>`
}

interface RemindResult {
  invoiceId: string
  email: boolean
  push: number
  errors: string[]
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 160)

/** Fail a step after ms instead of hanging the whole function into the 546 worker limit. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out after ${ms / 1000}s`)), ms))])
}

async function remind(admin: Admin, inv: Invoice, bank: string, smtp: SMTPClient | null): Promise<RemindResult> {
  const nth = (inv.reminder_count ?? 0) + 1
  const out: RemindResult = { invoiceId: inv.id, email: false, push: 0, errors: [] }
  const title = 'تذكير بسداد فاتورة'
  const body = `${inv.title} — ${sar(inv.amount_cents)}`

  // Claim first, so a run cut short can never send the same reminder twice.
  const { error: claimErr } = await admin
    .from('student_invoices')
    .update({ reminder_count: nth, last_reminded_at: new Date().toISOString() })
    .eq('id', inv.id)
  if (claimErr) {
    out.errors.push(`claim: ${claimErr.message}`)
    return out
  }

  try {
    await admin.from('notifications').insert({ user_id: inv.user_id, kind: 'invoice_reminder', title, body, url: '/student/invoices' })
  } catch (e) {
    out.errors.push(`notification: ${errText(e)}`)
  }

  // No Web Push here: loading/encrypting with web-push exceeded the edge
  // function CPU limit (HTTP 546). The dashboard bell above + the email cover it.

  if (!smtp) {
    out.errors.push('email: SMTP not configured')
    return out
  }
  try {
    const { data: au } = await admin.auth.admin.getUserById(inv.user_id)
    const to = au?.user?.email
    if (!to || to.endsWith('.invalid')) {
      out.errors.push('email: student has no email')
      return out
    }
    const { data: student } = await admin.from('profiles').select('name').eq('id', inv.user_id).maybeSingle()
    await withTimeout(smtp.send({
      from: SMTP_FROM,
      to,
      // ASCII-only subject: denomailer mis-folds long UTF-8 subjects, which pushes the
      // From header into the body and Gmail rejects the mail (550 5.7.1, RFC 5322).
      subject: `Payment reminder - Invoice INV-${inv.id.slice(0, 8).toUpperCase()} - Pioneers Health Research`,
      content: `تذكير بسداد الفاتورة "${inv.title}" بمبلغ ${sar(inv.amount_cents)}. عرض الفاتورة: ${SITE_URL}/student/invoices`,
      html: reminderHtml(inv, (student?.name as string) || '', bank, nth),
    }), 15000, 'email (SMTP ' + SMTP_HOST + ':' + SMTP_PORT + ')')
    out.email = true
  } catch (e) {
    out.errors.push(`email: ${errText(e)}`)
  }
  return out
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  let body: { invoiceId?: string } = {}
  try {
    body = await req.json()
  } catch {
    // empty body = automatic run
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: bankRow } = await admin.from('site_content').select('value_ar, value_en').eq('key', 'bank.details').maybeSingle()
  const bank = (bankRow?.value_ar || bankRow?.value_en || '') as string
  const cols = 'id, user_id, title, amount_cents, created_at, reminder_count, last_reminded_at'

  let targets: Invoice[] = []
  if (body.invoiceId) {
    // Manual: verified owner only.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'missing authorization' }, 401)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: ownerVerified } = await userClient.rpc('is_verified_owner')
    if (!ownerVerified) return json({ error: 'not a verified owner' }, 403)
    const { data: inv } = await admin.from('student_invoices').select(`${cols}, status`).eq('id', body.invoiceId).maybeSingle()
    if (!inv) return json({ error: 'invoice not found' }, 404)
    if (inv.status !== 'unpaid') return json({ error: 'not unpaid' }, 409)
    const last = inv.last_reminded_at ? new Date(inv.last_reminded_at as string).getTime() : 0
    if (Date.now() - last < MANUAL_COOLDOWN_MS) return json({ error: 'recently reminded' }, 429)
    targets = [inv as unknown as Invoice]
  } else {
    // Automatic: unpaid, 2+ days old, last reminder 2+ days ago, under the cap.
    const cutoff = new Date(Date.now() - GAP_MS).toISOString()
    const { data } = await admin
      .from('student_invoices')
      .select(cols)
      .eq('status', 'unpaid')
      .lt('created_at', cutoff)
      .lt('reminder_count', MAX_AUTO)
      .or(`last_reminded_at.is.null,last_reminded_at.lt.${cutoff}`)
      .order('last_reminded_at', { ascending: true, nullsFirst: true })
      .limit(10)
    targets = (data ?? []) as unknown as Invoice[]
  }
  if (targets.length === 0) return json({ reminded: 0 })

  const smtp =
    SMTP_USER && SMTP_PASS
      ? new SMTPClient({ connection: { hostname: SMTP_HOST, port: SMTP_PORT, tls: SMTP_PORT === 465, auth: { username: SMTP_USER, password: SMTP_PASS } } })
      : null
  const results: RemindResult[] = []
  try {
    for (const inv of targets) results.push(await remind(admin, inv, bank, smtp))
  } finally {
    if (smtp) {
      try {
        await withTimeout(smtp.close(), 5000, 'smtp close')
      } catch {
        // ignore
      }
    }
  }
  return json({ reminded: results.length, results })
})
