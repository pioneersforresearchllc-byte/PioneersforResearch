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

async function sendOtpEmail(to: string, code: string): Promise<'sent' | 'not_configured' | 'failed'> {
  if (!SMTP_USER || !SMTP_PASS) return 'not_configured'
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
    return 'sent'
  } catch (err) {
    // Real delivery failure — most likely Gmail's daily/weekly personal
    // sending limit was hit, not a bad address. Caller falls back to a
    // lighter domain check instead of hard-blocking registration.
    console.error('smtp send failed', err)
    return 'failed'
  } finally {
    try {
      await client.close()
    } catch {
      // already closed/never opened — ignore
    }
  }
}

// Used only when real SMTP delivery fails (see above) — confirms the
// email's domain can receive mail at all (e.g. gmail.com resolves, a typo'd
// or fake domain doesn't), without actually sending anything. This can't
// confirm the specific mailbox exists — true per-mailbox verification would
// require an SMTP RCPT TO probe, which Gmail deliberately ignores — but it
// stops obviously fake addresses while letting real users through when our
// own send quota is the blocker, not their email.
async function domainHasMx(email: string): Promise<boolean> {
  const domain = email.split('@')[1]
  if (!domain) return false
  try {
    const records = await Deno.resolveDns(domain, 'MX')
    return records.length > 0
  } catch {
    return false
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

  const { data: recent } = await admin
    .from('signup_otps')
    .select('created_at')
    .eq('user_id', user.id)
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

  const emailResult = await sendOtpEmail(user.email, code)

  if (emailResult === 'failed') {
    const validDomain = await domainHasMx(user.email)
    if (!validDomain) return json({ error: 'invalid_email' }, 400)

    // Can't deliver the code ourselves — auto-verify instead of permanently
    // blocking a real user because our own sending quota ran out.
    const { error: insertErr } = await admin.from('signup_otps').insert({
      user_id: user.id,
      code_hash: codeHash,
      expires_at: expiresAt,
      consumed: true,
      verified_at: new Date().toISOString(),
    })
    if (insertErr) return json({ error: insertErr.message }, 500)

    return json({ sent: true, emailed: false, autoVerified: true })
  }

  const { error: insertErr } = await admin
    .from('signup_otps')
    .insert({ user_id: user.id, code_hash: codeHash, expires_at: expiresAt })
  if (insertErr) return json({ error: insertErr.message }, 500)

  return json({
    sent: true,
    emailed: emailResult === 'sent',
    ...(emailResult === 'not_configured' ? { devCode: code } : {}),
  })
})
