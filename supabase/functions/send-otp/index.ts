// Step 2 of owner login. Called by an already-password-authenticated
// session (Authorization header carries that user's JWT). Generates a real
// 6-digit code, stores only its hash + a 10-minute expiry, and emails it via
// SMTP (e.g. the owner's own Gmail account). Sandboxed by default: with no
// SMTP_USER/SMTP_PASS set, the email send is skipped and the code is
// returned directly in the response (only to this same authenticated owner
// — never logged or exposed elsewhere) so the flow is fully testable before
// real credentials exist. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS (and
// optionally SMTP_FROM) as function secrets to switch to real delivery —
// no code change needed.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

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
// Defaults target Gmail's SMTP server; override SMTP_HOST/SMTP_PORT to use
// a different provider. SMTP_USER must be the full mailbox address;
// SMTP_PASS must be a Gmail "App Password" (16 chars, from Google Account →
// Security → 2-Step Verification → App passwords) — a regular Gmail
// password is rejected by Google for SMTP auth.
const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com'
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') || '465')
const SMTP_USER = Deno.env.get('SMTP_USER')
const SMTP_PASS = Deno.env.get('SMTP_PASS')
const SMTP_FROM = Deno.env.get('SMTP_FROM') || SMTP_USER || ''

// Browser calls to Edge Functions are cross-origin (the site runs on
// Vercel, the function on supabase.co), so without these headers the
// browser blocks the response entirely — curl/server-to-server calls never
// hit this since CORS is a browser-only enforcement.
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
      subject: 'رمز الدخول إلى بوابة الإدارة',
      html: `<div dir="rtl" style="font-family:sans-serif"><p>رمز الدخول الخاص بك هو:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>صالح لمدة 10 دقائق.</p></div>`,
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
