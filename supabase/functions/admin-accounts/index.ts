// Owner-only account management. Two actions:
//   { action: 'list' }                              → every profile joined
//        with its auth email + last_sign_in_at (last activity).
//   { action: 'set_password', userId, newPassword } → force-set a user's
//        password (admin reset).
// Guarded so only a verified owner may call it; a temp admin may list but
// not reset passwords, mirroring the "temp admins can't remove admins" rule.
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

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: me } = await admin.from('profiles').select('role, is_temp_admin').eq('id', user.id).maybeSingle()
  if (!me || me.role !== 'owner') return json({ error: 'not an owner account' }, 403)

  let body: { action?: string; userId?: string; newPassword?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }

  if (body.action === 'list') {
    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('id, name, username, role, status, is_temp_admin, created_at')
      .order('created_at', { ascending: false })
    if (profErr) return json({ error: profErr.message }, 500)

    // auth.users carries the email + last_sign_in_at; page through everyone.
    const authByIds = new Map<string, { email: string | null; lastSignInAt: string | null }>()
    let page = 1
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) break
      for (const u of data.users) {
        authByIds.set(u.id, { email: u.email ?? null, lastSignInAt: u.last_sign_in_at ?? null })
      }
      if (data.users.length < 1000) break
      page += 1
    }

    const accounts = (profiles ?? []).map((p) => ({
      ...p,
      email: authByIds.get(p.id)?.email ?? null,
      last_sign_in_at: authByIds.get(p.id)?.lastSignInAt ?? null,
    }))
    return json({ accounts })
  }

  if (body.action === 'set_password') {
    if (me.is_temp_admin) return json({ error: 'temp admins cannot reset passwords' }, 403)
    const targetId = body.userId
    const newPassword = body.newPassword || ''
    if (!targetId) return json({ error: 'missing userId' }, 400)
    if (newPassword.length < 6) return json({ error: 'password too short' }, 400)

    const { error } = await admin.auth.admin.updateUserById(targetId, { password: newPassword })
    if (error) return json({ error: error.message }, 500)
    return json({ updated: true })
  }

  return json({ error: 'unknown action' }, 400)
})
