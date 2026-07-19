// A student redeems a course's private access code to enrol for free (no
// payment). The code is checked server-side against course_access_codes; on a
// match the enrolment is created with the service role, bypassing the paid-
// course guard — but only because the correct secret code was supplied.
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
    console.error('redeem-course-code failed', err)
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

  let body: { courseId?: string; code?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  const courseId = body.courseId
  const code = (body.code || '').trim()
  if (!courseId || !code) return json({ error: 'missing courseId or code' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  // Only students enrol.
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!profile || profile.role !== 'student') return json({ error: 'students only' }, 403)

  const { data: row } = await admin
    .from('course_access_codes')
    .select('code')
    .eq('course_id', courseId)
    .maybeSingle()
  if (!row || row.code.trim().toLowerCase() !== code.toLowerCase()) {
    return json({ error: 'invalid_code' }, 400)
  }

  // Already enrolled? Treat as success so the button is idempotent.
  const { data: existing } = await admin
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', user.id)
    .maybeSingle()
  if (existing) return json({ enrolled: true })

  // Respect capacity.
  const { data: course } = await admin.from('courses').select('capacity').eq('id', courseId).maybeSingle()
  if (!course) return json({ error: 'course not found' }, 404)
  if (course.capacity != null) {
    const { count } = await admin
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId)
    if ((count ?? 0) >= course.capacity) return json({ error: 'course is full' }, 409)
  }

  const { error: insertErr } = await admin.from('enrollments').insert({ course_id: courseId, student_id: user.id })
  if (insertErr) return json({ error: insertErr.message }, 500)

  return json({ enrolled: true })
}
