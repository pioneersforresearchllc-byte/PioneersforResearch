// Owner-only account management. Actions:
//   { action: 'list' }                                → every profile + auth
//        email/last_sign_in + suspended/restrictions.
//   { action: 'set_password', userId, newPassword }   → admin password reset.
//   { action: 'set_suspended', userId, suspended }    → temporarily disable /
//        re-enable an account (blocks login while suspended).
//   { action: 'set_restrictions', userId, restrictions[] } → ban a user from
//        specific capabilities (chat / requests / comments / submissions).
//   { action: 'delete_user', userId }                 → permanently delete.
//   { action: 'enroll' | 'unenroll', userId, courseId } → manage a student's
//        course enrollment by hand.
// Guarded so only a verified owner may call it. Temp admins may not reset
// passwords or delete users. Owner accounts can't be suspended/deleted (no
// self-lockout / admin wars).
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

const ALLOWED_RESTRICTIONS = ['chat', 'requests', 'comments', 'submissions']

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

  let body: {
    action?: string
    userId?: string
    newPassword?: string
    suspended?: boolean
    restrictions?: string[]
    courseId?: string
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }

  // Load the target's role once for the guards below.
  const loadTargetRole = async (id: string): Promise<string | null> => {
    const { data } = await admin.from('profiles').select('role').eq('id', id).maybeSingle()
    return data?.role ?? null
  }

  if (body.action === 'list') {
    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('id, name, username, role, status, is_temp_admin, suspended, restrictions, created_at')
      .order('created_at', { ascending: false })
    if (profErr) return json({ error: profErr.message }, 500)

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

  if (body.action === 'set_suspended') {
    if (!body.userId) return json({ error: 'missing userId' }, 400)
    if (body.userId === user.id) return json({ error: 'cannot suspend yourself' }, 400)
    if ((await loadTargetRole(body.userId)) === 'owner') return json({ error: 'cannot suspend an owner' }, 403)
    const { error } = await admin.from('profiles').update({ suspended: !!body.suspended }).eq('id', body.userId)
    if (error) return json({ error: error.message }, 500)
    return json({ updated: true })
  }

  if (body.action === 'set_restrictions') {
    if (!body.userId) return json({ error: 'missing userId' }, 400)
    const clean = Array.from(new Set((body.restrictions ?? []).filter((r) => ALLOWED_RESTRICTIONS.includes(r))))
    const { error } = await admin.from('profiles').update({ restrictions: clean }).eq('id', body.userId)
    if (error) return json({ error: error.message }, 500)
    return json({ updated: true, restrictions: clean })
  }

  if (body.action === 'delete_user') {
    if (me.is_temp_admin) return json({ error: 'temp admins cannot delete users' }, 403)
    if (!body.userId) return json({ error: 'missing userId' }, 400)
    if (body.userId === user.id) return json({ error: 'cannot delete yourself' }, 400)
    if ((await loadTargetRole(body.userId)) === 'owner') return json({ error: 'cannot delete an owner' }, 403)
    // Deleting the auth user cascades to the profile row (FK on delete cascade).
    const { error } = await admin.auth.admin.deleteUser(body.userId)
    if (error) return json({ error: error.message }, 500)
    return json({ deleted: true })
  }

  if (body.action === 'enroll' || body.action === 'unenroll') {
    if (!body.userId || !body.courseId) return json({ error: 'missing userId or courseId' }, 400)
    if (body.action === 'enroll') {
      const { error } = await admin
        .from('enrollments')
        .insert({ student_id: body.userId, course_id: body.courseId })
      if (error && error.code !== '23505') return json({ error: error.message }, 500)
      return json({ enrolled: true })
    }
    const { error } = await admin
      .from('enrollments')
      .delete()
      .eq('student_id', body.userId)
      .eq('course_id', body.courseId)
    if (error) return json({ error: error.message }, 500)
    return json({ unenrolled: true })
  }

  return json({ error: 'unknown action' }, 400)
})
