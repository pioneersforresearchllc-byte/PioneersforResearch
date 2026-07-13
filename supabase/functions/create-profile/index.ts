// Creates the `profiles` row for a just-registered auth user, using the
// service role so it works regardless of whether the project requires
// email confirmation (a brand-new user may not have a session yet, so the
// client can't rely on RLS's `id = auth.uid()` self-insert policy).
import { createClient } from 'npm:@supabase/supabase-js@2'

// This project migrated to Supabase's new JWT Signing Keys, which
// deprecates the auto-injected SUPABASE_SERVICE_ROLE_KEY in favor of a JSON
// dictionary (SUPABASE_SECRET_KEYS). Prefer the new one; fall back to the
// legacy var for projects that haven't migrated.
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

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface StudentPayload {
  user_id: string
  role: 'student'
  name: string
  username: string
}

interface TeacherPayload {
  user_id: string
  role: 'teacher'
  name: string
  username: string
  specialty: string
  qualification: string
  years_experience: number
  cv_text: string
  cv_file_url?: string
}

type Payload = StudentPayload | TeacherPayload

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
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }

  if (!payload.user_id || !payload.name?.trim() || !payload.username?.trim()) {
    return json({ error: 'missing required fields' }, 400)
  }
  if (payload.role !== 'student' && payload.role !== 'teacher') {
    return json({ error: 'invalid role' }, 400)
  }

  // Verify the auth user actually exists and has no profile yet (defends
  // against this function being called for an arbitrary user_id).
  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(payload.user_id)
  if (authErr || !authUser?.user) return json({ error: 'unknown user_id' }, 404)

  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('id', payload.user_id)
    .maybeSingle()
  if (existing) return json({ error: 'profile already exists' }, 409)

  // Require a verified signup_otps row before allowing the profile to be
  // created — this is the actual bot gate, enforced server-side so it
  // can't be skipped by calling this function directly without going
  // through send-signup-otp / verify-signup-otp first.
  const { data: verifiedOtp } = await admin
    .from('signup_otps')
    .select('id')
    .eq('user_id', payload.user_id)
    .eq('consumed', true)
    .maybeSingle()
  if (!verifiedOtp) return json({ error: 'email not verified' }, 403)

  const row =
    payload.role === 'student'
      ? {
          id: payload.user_id,
          role: 'student' as const,
          status: 'active' as const,
          name: payload.name.trim(),
          username: payload.username.trim(),
        }
      : {
          id: payload.user_id,
          role: 'teacher' as const,
          status: 'pending' as const,
          name: payload.name.trim(),
          username: payload.username.trim(),
          specialty: payload.specialty?.trim() || null,
          qualification: payload.qualification?.trim() || null,
          years_experience: Number.isFinite(payload.years_experience) ? payload.years_experience : null,
          cv_text: payload.cv_text?.trim() || null,
          cv_file_url: payload.cv_file_url?.trim() || null,
        }

  const { data, error } = await admin.from('profiles').insert(row).select('*').single()
  if (error) {
    // Unique violation on username is the one expected failure mode here.
    const status = error.code === '23505' ? 409 : 500
    return json({ error: error.message }, status)
  }

  return json({ profile: data })
})
