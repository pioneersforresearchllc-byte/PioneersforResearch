// Validates a discount code BEFORE checkout and returns the discounted price so
// the UI can show "valid ✓", strike the old price, and only then let the user
// pay. The checkout functions re-run the exact same checks, so this is a
// convenience preview — never the source of truth.
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
const NEW_USER_DAYS = 30

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
    console.error('validate-discount failed', err)
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

  let body: { code?: string; courseId?: string; requestId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  const code = (body.code || '').trim()
  if (!code) return json({ valid: false, reason: 'empty' })

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  // Resolve the target and its full (pre-discount) price.
  let originalCents = 0
  let targetColumn: 'course_id' | 'service_id' = 'course_id'
  let targetValue = ''
  if (body.courseId) {
    const { data: course } = await admin.from('courses').select('price_cents').eq('id', body.courseId).maybeSingle()
    if (!course) return json({ valid: false, reason: 'not_found' })
    originalCents = course.price_cents
    targetColumn = 'course_id'
    targetValue = body.courseId
  } else if (body.requestId) {
    const { data: request } = await admin
      .from('service_requests')
      .select('final_price_cents, user_id, service_id, status')
      .eq('id', body.requestId)
      .maybeSingle()
    if (!request || request.user_id !== user.id) return json({ valid: false, reason: 'not_found' })
    originalCents = request.final_price_cents ?? 0
    targetColumn = 'service_id'
    targetValue = request.service_id
  } else {
    return json({ error: 'missing target' }, 400)
  }

  const result = await evaluateDiscount(admin, code, user.id, targetColumn, targetValue, originalCents)
  return json(result)
}

// Shared checks used here and (in spirit) at checkout. Returns a validity result
// plus the computed price so the client can preview it.
export async function evaluateDiscount(
  admin: ReturnType<typeof createClient>,
  code: string,
  userId: string,
  targetColumn: 'course_id' | 'service_id',
  targetValue: string,
  originalCents: number,
): Promise<{ valid: boolean; reason?: string; percent_off?: number; original_cents?: number; discounted_cents?: number }> {
  const nowIso = new Date().toISOString()
  const { data: dcs } = await admin
    .from('discount_codes')
    .select('id, percent_off, starts_at, ends_at, new_users_only, first_purchase_only')
    .ilike('code', code)
    .eq('active', true)
  const dc = (dcs ?? []).find(
    (d: Record<string, unknown>) =>
      (!d.starts_at || (d.starts_at as string) <= nowIso) && (!d.ends_at || (d.ends_at as string) >= nowIso),
  )
  if (!dc) return { valid: false, reason: 'invalid' }

  const { data: target } = await admin
    .from('discount_code_targets')
    .select('id')
    .eq('discount_code_id', dc.id)
    .eq(targetColumn, targetValue)
    .maybeSingle()
  if (!target) return { valid: false, reason: 'invalid' }

  if (dc.new_users_only) {
    const { data: profile } = await admin.from('profiles').select('created_at').eq('id', userId).maybeSingle()
    const created = profile?.created_at ? new Date(profile.created_at as string).getTime() : 0
    const ageDays = (Date.now() - created) / (1000 * 60 * 60 * 24)
    if (ageDays > NEW_USER_DAYS) return { valid: false, reason: 'new_users_only' }
  }

  if (dc.first_purchase_only) {
    const { count } = await admin
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', userId)
      .eq('status', 'completed')
    if ((count ?? 0) > 0) return { valid: false, reason: 'first_purchase_only' }
  }

  const discounted = Math.max(50, Math.round((originalCents * (100 - (dc.percent_off as number))) / 100))
  return {
    valid: true,
    percent_off: dc.percent_off as number,
    original_cents: originalCents,
    discounted_cents: discounted,
  }
}
