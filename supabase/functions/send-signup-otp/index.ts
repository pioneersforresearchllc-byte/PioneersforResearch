// Called right after supabase.auth.signUp() during student/teacher
// registration, using that brand-new session's JWT. Generates a 6-digit
// code, stores only its hash + a 10-minute expiry, and emails it via SMTP.
// The account has no profiles row yet at this point — create-profile
// refuses to run until this code is verified (see verify-signup-otp),
// which is what actually blocks bots from completing registration, not
// just the UI flow. Sandboxed like send-otp: with no SMTP_USER/SMTP_PASS
// set, the code is returned directly in the response instead of emailed.
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

async function sendOtpEmail(to: string, code: string) {
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
      subject: 'رمز تأكيد إنشاء الحساب',
      // denomailer needs a plain-text `content` alongside `html` to build a
      // correct multipart/alternative message — omitting it produced a
      // malformed MIME structure that showed up as raw source in Gmail.
      content: `رمز تأكيد إنشاء حسابك في منصة Pioneers for Research هو: ${code}\nصالح لمدة 10 دقائق. إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.`,
      html: `<div dir="rtl" style="font-family:sans-serif"><p>رمز تأكيد إنشاء حسابك في منصة Pioneers for Research هو:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>صالح لمدة 10 دقائق. إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.</p></div>`,
    })
    return true
  } catch (err) {
    console.error('smtp send failed', err)
    return false
  } finally {
    await client.close()
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'missing authorization' }, 401)

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()
  if (userErr || !user || !user.email) return json({ error: 'unauthorized' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // A verified user shouldn't be able to keep re-requesting codes once
  // they already have a profile (registration is a one-time flow).
  const { data: existingProfile } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle()
  if (existingProfile) return json({ error: 'already registered' }, 409)

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const codeHash = await sha256Hex(code)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const { error: insertErr } = await admin
    .from('signup_otps')
    .insert({ user_id: user.id, code_hash: codeHash, expires_at: expiresAt })
  if (insertErr) return json({ error: insertErr.message }, 500)

  const emailed = await sendOtpEmail(user.email, code)

  return json({
    sent: true,
    emailed,
    ...(emailed ? {} : { devCode: code }),
  })
})
