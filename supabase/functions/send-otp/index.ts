// Step 2 of owner login. Called by an already-password-authenticated
// session (Authorization header carries that user's JWT). Generates a real
// 6-digit code, stores only its hash + a 10-minute expiry, and emails it
// via Resend. Sandboxed by default: with no RESEND_API_KEY set, the email
// send is skipped and the code is returned directly in the response (only
// to this same authenticated owner — never logged or exposed elsewhere) so
// the flow is fully testable before real credentials exist. Set
// RESEND_API_KEY (and optionally RESEND_FROM) as a function secret to
// switch to real delivery — no code change needed.
import { createClient } from 'npm:@supabase/supabase-js@2'

// This project migrated to Supabase's new JWT Signing Keys, which
// deprecates the auto-injected SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY
// in favor of JSON dictionaries (SUPABASE_SECRET_KEYS / SUPABASE_PUBLISHABLE_KEYS).
// Prefer the new ones; fall back to the legacy vars for projects that
// haven't migrated.
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
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'Pioneers for Research <onboarding@resend.dev>'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sendOtpEmail(to: string, code: string) {
  if (!RESEND_API_KEY) return false
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to,
      subject: 'رمز الدخول إلى بوابة الإدارة',
      html: `<div dir="rtl" style="font-family:sans-serif"><p>رمز الدخول الخاص بك هو:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>صالح لمدة 10 دقائق.</p></div>`,
    }),
  })
  return res.ok
}

Deno.serve(async (req) => {
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

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!profile || profile.role !== 'owner') return json({ error: 'not an owner account' }, 403)

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const codeHash = await sha256Hex(code)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const { error: insertErr } = await admin
    .from('admin_login_otps')
    .insert({ user_id: user.id, code_hash: codeHash, expires_at: expiresAt })
  if (insertErr) return json({ error: insertErr.message }, 500)

  const emailed = await sendOtpEmail(user.email, code)

  return json({
    sent: true,
    emailed,
    // Only present in sandbox mode (no RESEND_API_KEY) — returned solely to
    // this already-authenticated owner, mirroring the design's "no real
    // email in this prototype" screen until real credentials are added.
    ...(emailed ? {} : { devCode: code }),
  })
})
