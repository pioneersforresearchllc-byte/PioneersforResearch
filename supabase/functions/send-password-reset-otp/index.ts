// "Forgot password" step 1. Public (no session — the whole point is the
// user is locked out). Explicitly reports whether the email is registered
// so the user gets a clear message instead of being sent to an "enter your
// code" screen for an email that never received one — a deliberate
// trade-off of email-enumeration hardening for a less confusing flow on
// this small platform.
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
const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com'
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') || '465')
const SMTP_USER = Deno.env.get('SMTP_USER')
const SMTP_PASS = Deno.env.get('SMTP_PASS')
const SMTP_FROM = Deno.env.get('SMTP_FROM') || SMTP_USER || ''

const RESEND_COOLDOWN_MS = 5 * 60 * 1000

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function findUserIdByEmail(admin: ReturnType<typeof createClient>, email: string): Promise<string | null> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error || !data) return null
  const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  return match?.id ?? null
}

async function sendResetEmail(to: string, code: string) {
  if (!SMTP_USER || !SMTP_PASS) return false
  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: SMTP_PORT === 465,
      auth: { username: SMTP_USER, password: SMTP_PASS },
    },
  })
  try {
    await client.send({
      from: SMTP_FROM,
      to,
      subject: 'رمز إعادة تعيين كلمة المرور',
      content: `رمز إعادة تعيين كلمة المرور الخاص بك هو: ${code}\nصالح لمدة 10 دقائق. إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.`,
      html: `<div dir="rtl" style="font-family:sans-serif"><p>رمز إعادة تعيين كلمة المرور الخاص بك هو:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>صالح لمدة 10 دقائق. إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.</p></div>`,
    })
    return true
  } catch {
    return false
  } finally {
    try {
      await client.close()
    } catch {
      // already closed/never opened — ignore
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  const email = (body.email || '').trim()
  if (!email) return json({ error: 'missing email' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const userId = await findUserIdByEmail(admin, email)
  if (!userId) return json({ error: 'email_not_found' }, 404)

  const { data: recent } = await admin
    .from('password_reset_otps')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (recent) {
    const waitMs = RESEND_COOLDOWN_MS - (Date.now() - new Date(recent.created_at).getTime())
    if (waitMs > 0) return json({ error: 'rate_limited', retryAfterSeconds: Math.ceil(waitMs / 1000) }, 429)
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const codeHash = await sha256Hex(code)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await admin.from('password_reset_otps').insert({ user_id: userId, code_hash: codeHash, expires_at: expiresAt })
  const emailed = await sendResetEmail(email, code)

  return json({ sent: true, emailed })
})
