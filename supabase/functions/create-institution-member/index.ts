// An institution's admin creates a team member account (manager, coordinator…)
// for their own organisation. Creating an auth user needs the service role, so
// it happens here — guarded by is_institution_admin() so only that
// institution's admin can add people, and only to their own institution.
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
  try {
    return await handle(req)
  } catch (err) {
    console.error('create-institution-member failed', err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

async function handle(req: Request): Promise<Response> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'missing authorization' }, 401)

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()
  if (userErr || !user) return json({ error: 'unauthorized' }, 401)

  // Only this institution's admin, and only for their own institution.
  const { data: isAdmin } = await userClient.rpc('is_institution_admin')
  if (!isAdmin) return json({ error: 'not an institution admin' }, 403)
  const { data: institutionId } = await userClient.rpc('current_institution_id')
  if (!institutionId) return json({ error: 'no institution' }, 400)

  let body: { name?: string; username?: string; email?: string; password?: string; memberRole?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  const { name, username, email, password } = body
  const memberRole = body.memberRole === 'admin' ? 'admin' : body.memberRole === 'coordinator' ? 'coordinator' : 'member'
  if (!name?.trim() || !username?.trim() || !email?.trim() || !password) {
    return json({ error: 'missing required fields' }, 400)
  }
  if (password.length < 6) return json({ error: 'password too short' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
  })
  if (createErr || !created.user) return json({ error: createErr?.message ?? 'could not create account' }, 400)

  // Team members are institution accounts too, active immediately — the
  // organisation itself was already verified.
  const { error: profileErr } = await admin.from('profiles').insert({
    id: created.user.id,
    role: 'institution',
    status: 'active',
    name: name.trim(),
    username: username.trim(),
  })
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id)
    return json({ error: profileErr.message }, profileErr.code === '23505' ? 409 : 500)
  }

  const { error: memberErr } = await admin
    .from('institution_members')
    .insert({ institution_id: institutionId, user_id: created.user.id, member_role: memberRole })
  if (memberErr) {
    await admin.auth.admin.deleteUser(created.user.id)
    return json({ error: memberErr.message }, 500)
  }

  return json({ created: true })
}
