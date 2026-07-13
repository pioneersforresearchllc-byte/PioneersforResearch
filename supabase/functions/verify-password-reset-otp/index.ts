// "Forgot password" step 2. Public (no session). Verifies the code sent by
// send-password-reset-otp and, if valid, sets the new password directly via
// the Admin API. Errors are deliberately generic ("invalid code") whether
// the email doesn't exist, the code is wrong, or it expired — same
// anti-enumeration reasoning as send-password-reset-otp.
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

const INVALID = { error: 'رمز غير صحيح أو منتهي الصلاحية' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  let body: { email?: string; code?: string; newPassword?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  const email = (body.email || '').trim()
  const code = (body.code || '').trim()
  const newPassword = body.newPassword || ''
  if (!email || !/^\d{6}$/.test(code)) return json(INVALID, 400)
  if (newPassword.length < 6) return json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const userId = await findUserIdByEmail(admin, email)
  if (!userId) return json(INVALID, 400)

  const { data: otp } = await admin
    .from('password_reset_otps')
    .select('id, code_hash, expires_at, consumed, attempts')
    .eq('user_id', userId)
    .eq('consumed', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!otp) return json(INVALID, 400)
  if (otp.attempts >= 5) return json({ error: 'محاولات كثيرة، اطلب رمزًا جديدًا' }, 429)

  const codeHash = await sha256Hex(code)
  if (codeHash !== otp.code_hash) {
    await admin
      .from('password_reset_otps')
      .update({ attempts: otp.attempts + 1 })
      .eq('id', otp.id)
    return json(INVALID, 400)
  }

  const { error: updateErr } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
  if (updateErr) return json({ error: 'تعذر تحديث كلمة المرور، حاول مجددًا' }, 500)

  await admin
    .from('password_reset_otps')
    .update({ consumed: true, verified_at: new Date().toISOString() })
    .eq('id', otp.id)

  return json({ reset: true })
})
