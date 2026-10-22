// send-xapi — forwards real course-lifecycle events to the NELC LRS as xAPI
// statements, so completed courses yield accredited certificates.
//
// Called by database triggers (see migration 0083) with a shared hook secret;
// it loads the learner + course with the service role, builds the matching
// statement(s) with _shared/xapi.ts, POSTs them to the NELC production LRS
// (Basic auth from secrets), and records every attempt in `xapi_log`.
//
// Secrets (set in Supabase, never in code/git):
//   NELC_LRS_URL   e.g. https://lrs.nelc.gov.sa/<prod-path>/xapi/statements
//   NELC_LRS_USER  production Basic-auth user
//   NELC_LRS_PASS  production Basic-auth password
//   XAPI_HOOK_SECRET  shared secret the DB trigger sends in x-hook-secret
//
// Deploy WITHOUT JWT verification (it authenticates via x-hook-secret):
//   supabase functions deploy send-xapi --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  buildCompleted,
  buildEarned,
  buildInitialized,
  buildProgressed,
  buildRated,
  buildRegistered,
  type Course,
  type Learner,
  PLATFORM_URL,
} from '../_shared/xapi.ts'

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
const LRS_URL = Deno.env.get('NELC_LRS_URL') || ''
const LRS_USER = Deno.env.get('NELC_LRS_USER') || ''
const LRS_PASS = Deno.env.get('NELC_LRS_PASS') || ''
const HOOK_SECRET = Deno.env.get('XAPI_HOOK_SECRET') || ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

type Payload = {
  event?: 'enrolled' | 'progressed' | 'completed' | 'rated' | 'earned'
  course_id?: string
  student_id?: string
  progress?: number
  stars?: number
  response?: string
  issuance_id?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  // Authenticate the caller (DB trigger) with the shared hook secret.
  const got = req.headers.get('x-hook-secret') || ''
  if (!HOOK_SECRET || got !== HOOK_SECRET) return json({ error: 'forbidden' }, 403)

  let p: Payload
  try {
    p = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  if (!p.event || !p.course_id || !p.student_id) return json({ error: 'missing event/course_id/student_id' }, 400)

  try {
    return await handle(p)
  } catch (err) {
    console.error('send-xapi failed', err)
    await logRow({ event: p.event, course_id: p.course_id, student_id: p.student_id, status: 0, response: String(err) })
    // Return 200 so the trigger does not retry-storm; the failure is in xapi_log.
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

async function handle(p: Payload): Promise<Response> {
  // Learner: profile (name, national_id) + auth email.
  const { data: profile } = await admin
    .from('profiles')
    .select('name, national_id')
    .eq('id', p.student_id)
    .maybeSingle()
  const nationalId = (profile?.national_id || '').trim()
  if (!nationalId) {
    await logRow({ event: p.event!, course_id: p.course_id!, student_id: p.student_id!, status: 0, response: 'skipped: no national_id' })
    return json({ ok: true, skipped: 'no_national_id' })
  }
  const { data: authUser } = await admin.auth.admin.getUserById(p.student_id!)
  const email = authUser?.user?.email || `${nationalId}@users.pioneersresearch.com`
  const learner: Learner = { nationalId, email, name: profile?.name }

  // Course.
  const { data: c } = await admin
    .from('courses')
    .select('id, title, description, duration_label')
    .eq('id', p.course_id)
    .maybeSingle()
  if (!c) return json({ error: 'course not found' }, 404)
  const course: Course = {
    id: c.id,
    title: c.title,
    description: c.description || '',
    durationLabel: c.duration_label || '',
    durationIso: isoFromDurationLabel(c.duration_label || ''),
  }

  const statements: Record<string, unknown>[] = []
  switch (p.event) {
    case 'enrolled':
      statements.push(buildRegistered(learner, course), buildInitialized(learner, course))
      break
    case 'progressed':
      statements.push(buildProgressed(learner, course, Number(p.progress ?? 0)))
      break
    case 'completed':
      statements.push(buildCompleted(learner, course))
      break
    case 'rated':
      statements.push(buildRated(learner, course, Number(p.stars ?? 5), p.response))
      break
    case 'earned': {
      const verifyUrl = p.issuance_id ? `${PLATFORM_URL}/verify/${p.issuance_id}` : undefined
      statements.push(buildEarned(learner, course, { id: p.issuance_id || course.id, verifyUrl }))
      break
    }
    default:
      return json({ error: 'unknown event' }, 400)
  }

  const results: { verb: string; status: number }[] = []
  for (const stmt of statements) {
    const verb = String((stmt as any)?.verb?.display?.['en-US'] || '')
    const { status, body } = await sendToLrs(stmt)
    results.push({ verb, status })
    await logRow({
      event: p.event!,
      course_id: p.course_id!,
      student_id: p.student_id!,
      actor_national_id: nationalId,
      object_id: String((stmt as any)?.object?.id || ''),
      verb,
      statement: stmt,
      status,
      response: body.slice(0, 500),
    })
  }
  const allOk = results.every((r) => r.status === 200 || r.status === 204)
  return json({ ok: allOk, results })
}

async function sendToLrs(statement: unknown): Promise<{ status: number; body: string }> {
  if (!LRS_URL || !LRS_USER) return { status: 0, body: 'LRS not configured' }
  const auth = btoa(`${LRS_USER}:${LRS_PASS}`)
  const res = await fetch(LRS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Experience-API-Version': '1.0.3',
      Authorization: `Basic ${auth}`,
      // A plain UA — the LRS sits behind Cloudflare, which blocks default
      // bot user-agents (python-urllib, Deno) with HTTP 403 "error 1010".
      'User-Agent': 'Mozilla/5.0 (compatible; PioneersLRS/1.0; +https://www.pioneersresearch.com)',
    },
    body: JSON.stringify(statement),
  })
  const body = await res.text().catch(() => '')
  return { status: res.status, body }
}

type LogRow = {
  event: string
  course_id: string
  student_id: string
  actor_national_id?: string
  object_id?: string
  verb?: string
  statement?: unknown
  status: number
  response?: string
}

async function logRow(r: LogRow) {
  try {
    await admin.from('xapi_log').insert({
      event: r.event,
      course_id: r.course_id,
      student_id: r.student_id,
      actor_national_id: r.actor_national_id || null,
      object_id: r.object_id || null,
      verb: r.verb || null,
      statement: r.statement ?? null,
      status: r.status,
      response: r.response || null,
    })
  } catch (e) {
    console.error('xapi_log insert failed', e)
  }
}

// Best-effort ISO-8601 duration from a free-text label like "30 ساعة" / "30 hours".
function isoFromDurationLabel(label: string): string | undefined {
  const m = label.match(/(\d+)\s*(ساعة|ساعات|hour|hr|h)/i)
  if (m) return `PT${String(m[1]).padStart(2, '0')}H00M00S`
  return undefined
}
