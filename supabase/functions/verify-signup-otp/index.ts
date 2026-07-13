// Verifies the code sent by send-signup-otp. Marks the row consumed on
// success — create-profile checks for exactly that consumed row before it
// will insert a profile, so this is what actually gates registration, not
// just the UI step order. Blocks after 5 wrong attempts on a given code to
// slow down brute-forcing a 6-digit code.
import { createClient } from 'npm:@supabase/supabase-js@2'

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
  if (userErr || !user) return json({ error: 'unauthorized' }, 401)

  let body: { code?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  const code = (body.code || '').trim()
  if (!/^\d{6}$/.test(code)) return json({ error: 'رمز غير صالح' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: otp, error: fetchErr } = await admin
    .from('signup_otps')
    .select('id, code_hash, expires_at, consumed, attempts')
    .eq('user_id', user.id)
    .eq('consumed', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchErr) return json({ error: fetchErr.message }, 500)
  if (!otp) return json({ error: 'انتهت صلاحية الرمز، اطلب رمزًا جديدًا' }, 400)
  if (otp.attempts >= 5) return json({ error: 'محاولات كثيرة، اطلب رمزًا جديدًا' }, 429)

  const codeHash = await sha256Hex(code)
  if (codeHash !== otp.code_hash) {
    await admin
      .from('signup_otps')
      .update({ attempts: otp.attempts + 1 })
      .eq('id', otp.id)
    return json({ error: 'الرمز غير صحيح' }, 400)
  }

  const { error: updateErr } = await admin
    .from('signup_otps')
    .update({ consumed: true, verified_at: new Date().toISOString() })
    .eq('id', otp.id)
  if (updateErr) return json({ error: updateErr.message }, 500)

  return json({ verified: true })
})
