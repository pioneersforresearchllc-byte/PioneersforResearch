// Owner-only: creates (or removes) an owner/admin account. Uses the service
// role for auth.admin.createUser because doing this with the client-side
// signUp would hijack the CALLING owner's browser session by signing in as
// the brand-new user instead of keeping them logged in.
//
//   { name, username, email, password, isTemp } → create
//   { action: 'remove', userId }                → delete the admin's login too
//
// Errors come back as { error: <code> } so the dashboard can show a clear
// message: invalid_email, invalid_username, password_short, username_taken,
// email_in_use, missing_fields.
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// Same rule as the signup forms: usernames are a login identifier.
const USERNAME_RE = /^[^\s@]{3,30}$/u

async function findUserIdByEmail(admin: ReturnType<typeof createClient>, email: string): Promise<string | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data) return null
    const match = data.users.find((u) => u.email?.toLowerCase() === email)
    if (match) return match.id
    if (data.users.length < 1000) return null
  }
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

  // A temporary admin must not mint admins: it could create a permanent one
  // and outlive its own removal (privilege escalation).
  const { data: me } = await admin.from('profiles').select('is_temp_admin').eq('id', user.id).maybeSingle()
  if (me?.is_temp_admin) return json({ error: 'temp admins cannot manage admins' }, 403)

  let body: { action?: string; userId?: string; name?: string; username?: string; email?: string; password?: string; isTemp?: boolean }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }

  if (body.action === 'remove') {
    if (!body.userId || body.userId === user.id) return json({ error: 'invalid target' }, 400)
    const { data: target } = await admin.from('profiles').select('role').eq('id', body.userId).maybeSingle()
    if (target?.role !== 'owner') return json({ error: 'not an admin' }, 400)
    // Deleting the auth user cascades to the profile; deleting only the
    // profile left a live login behind and blocked re-using the email.
    const { error } = await admin.auth.admin.deleteUser(body.userId)
    if (error) return json({ error: error.message }, 500)
    return json({ removed: true })
  }

  const name = body.name?.trim() ?? ''
  const username = body.username?.trim() ?? ''
  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  if (!name || !username || !email || !password) return json({ error: 'missing_fields' }, 400)
  if (!EMAIL_RE.test(email)) return json({ error: 'invalid_email' }, 400)
  if (!USERNAME_RE.test(username)) return json({ error: 'invalid_username' }, 400)
  if (password.length < 6) return json({ error: 'password_short' }, 400)

  const { data: taken } = await admin.from('profiles').select('id').ilike('username', username.replace(/[\\%_]/g, '\\$&')).limit(1).maybeSingle()
  if (taken) return json({ error: 'username_taken' }, 409)

  let userId: string
  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created?.user) {
    userId = created.user.id
  } else {
    // The email may belong to a login with no profile (an admin removed
    // before this fix, or an abandoned signup) — reuse it instead of failing.
    const ghostId = await findUserIdByEmail(admin, email)
    if (!ghostId) {
      const inUse = /already|registered|exists/i.test(createErr?.message ?? '')
      return json({ error: inUse ? 'email_in_use' : (createErr?.message ?? 'create failed') }, inUse ? 409 : 400)
    }
    const { data: hasProfile } = await admin.from('profiles').select('id').eq('id', ghostId).maybeSingle()
    if (hasProfile) return json({ error: 'email_in_use' }, 409)
    const { error: updErr } = await admin.auth.admin.updateUserById(ghostId, { password, email_confirm: true })
    if (updErr) return json({ error: updErr.message }, 500)
    userId = ghostId
  }

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .insert({ id: userId, role: 'owner', status: 'active', name, username, is_temp_admin: !!body.isTemp })
    .select('*')
    .single()
  if (profileErr) {
    if (created?.user) await admin.auth.admin.deleteUser(userId)
    if (profileErr.code === '23505') return json({ error: 'username_taken' }, 409)
    return json({ error: profileErr.message }, 500)
  }

  return json({ profile })
})
