// Clears an abandoned, unverified signup so the same email can be reused.
// supabase.auth.signUp() creates the auth user immediately — before OTP
// verification — so a user who leaves without entering the code leaves a
// "ghost" account behind, and retrying with a different password would
// otherwise fail. This is called (public — the retrying user has no
// session) when signUp reports "User already registered":
//   - if that user already has a profiles row → it's a REAL account, we
//     refuse and report hasProfile so the client shows "email in use".
//   - if there's no profile → the signup was never completed, so we delete
//     the ghost auth user (its signup_otps cascade away) and the client
//     retries a clean signUp.
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

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data) return null
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (match) return match
    if (data.users.length < 1000) return null
    page += 1
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  const email = (body.email || '').trim()
  if (!email) return json({ error: 'missing email' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const user = await findUserByEmail(admin, email)
  if (!user) return json({ cleared: false, hasProfile: false })

  const { data: profile } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle()
  if (profile) return json({ cleared: false, hasProfile: true })

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) return json({ error: delErr.message }, 500)
  return json({ cleared: true, hasProfile: false })
})
