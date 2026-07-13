// Owner-only: creates a new owner/admin account. Uses the service role for
// auth.admin.createUser because doing this with the client-side signUp
// would hijack the CALLING owner's browser session by signing in as the
// brand-new user instead of keeping them logged in.
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

  const { data: isOwner } = await userClient.rpc('is_verified_owner')
  if (!isOwner) return json({ error: 'not a verified owner' }, 403)

  let body: { name?: string; username?: string; email?: string; password?: string; isTemp?: boolean }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  const { name, username, email, password, isTemp } = body
  if (!name?.trim() || !username?.trim() || !email?.trim() || !password) {
    return json({ error: 'missing required fields' }, 400)
  }
  if (password.length < 6) return json({ error: 'password too short' }, 400)

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
  })
  if (createErr || !created.user) {
    return json({ error: createErr?.message ?? 'تعذر إنشاء الحساب' }, 400)
  }

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .insert({
      id: created.user.id,
      role: 'owner',
      status: 'active',
      name: name.trim(),
      username: username.trim(),
      is_temp_admin: !!isTemp,
    })
    .select('*')
    .single()
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id)
    const status = profileErr.code === '23505' ? 409 : 500
    return json({ error: profileErr.message }, status)
  }

  return json({ profile })
})
