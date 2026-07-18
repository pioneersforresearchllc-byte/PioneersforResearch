// Step 3 of owner login. Marks the matching admin_login_otps row consumed
// and sets verified_at — public.is_verified_owner() (used throughout RLS)
// checks exactly that row, so this is what actually unlocks owner-only
// database access, not just the UI route.
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

  let body: { code?: string; deviceId?: string }
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
    .from('admin_login_otps')
    .select('id, code_hash, expires_at, consumed')
    .eq('user_id', user.id)
    .eq('consumed', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchErr) return json({ error: fetchErr.message }, 500)
  if (!otp) return json({ error: 'انتهت صلاحية الرمز، اطلب رمزًا جديدًا' }, 400)

  const codeHash = await sha256Hex(code)
  if (codeHash !== otp.code_hash) return json({ error: 'الرمز غير صحيح' }, 400)

  const { error: updateErr } = await admin
    .from('admin_login_otps')
    .update({ consumed: true, verified_at: new Date().toISOString() })
    .eq('id', otp.id)
  if (updateErr) return json({ error: updateErr.message }, 500)

  await admin.from('login_events').insert({ user_id: user.id })

  // Remember this device so its next logins (within 48h) can skip the email.
  // last_verified_at tracks real verifications only, so the 48h cadence holds.
  const deviceId = (body.deviceId || '').trim()
  if (deviceId) {
    const deviceHash = await sha256Hex(deviceId)
    await admin.from('admin_trusted_devices').upsert(
      { user_id: user.id, device_hash: deviceHash, last_verified_at: new Date().toISOString() },
      { onConflict: 'user_id,device_hash' },
    )
  }

  return json({ verified: true })
})
