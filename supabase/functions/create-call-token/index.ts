// Mints a Daily meeting token for a service session's live video call, after
// verifying the caller is allowed in (the request's student, its assigned
// teacher, or a verified owner). The Daily room is created on first join and
// cached on the session. Staff (teacher/owner) join as owners (can record);
// the student joins as a normal participant (cannot record).
//
// Needs Supabase secret: DAILY_API_KEY.
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
const DAILY_API_KEY = (Deno.env.get('DAILY_API_KEY') || '').trim()
const DAILY_API = 'https://api.daily.co/v1'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}

async function daily(path: string, body: unknown) {
  const res = await fetch(`${DAILY_API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${DAILY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { info?: string }).info || `Daily API ${res.status}`)
  return data as Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  try {
    return await handle(req)
  } catch (err) {
    console.error('create-call-token failed', err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

async function handle(req: Request): Promise<Response> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'missing authorization' }, 401)
  if (!DAILY_API_KEY) return json({ error: 'video not configured' }, 503)

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()
  if (userErr || !user) return json({ error: 'unauthorized' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  let body: { sessionId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  if (!body.sessionId) return json({ error: 'missing sessionId' }, 400)

  const { data: caller } = await admin.from('profiles').select('id, name, role').eq('id', user.id).maybeSingle()
  if (!caller) return json({ error: 'no profile' }, 403)

  const { data: session } = await admin
    .from('service_sessions')
    .select('id, request_id, title, daily_room_name, daily_room_url')
    .eq('id', body.sessionId)
    .maybeSingle()
  if (!session) return json({ error: 'session not found' }, 404)

  const { data: reqRow } = await admin
    .from('service_requests')
    .select('user_id, assigned_teacher_id')
    .eq('id', session.request_id as string)
    .maybeSingle()
  if (!reqRow) return json({ error: 'request not found' }, 404)

  const isStudent = caller.id === reqRow.user_id
  const isStaff = caller.id === reqRow.assigned_teacher_id || caller.role === 'owner'
  if (!isStudent && !isStaff) return json({ error: 'not allowed' }, 403)

  // Ensure a Daily room exists for this session (create once, then cache).
  let roomName = session.daily_room_name as string | null
  let roomUrl = session.daily_room_url as string | null
  if (!roomName || !roomUrl) {
    const room = await daily('/rooms', {
      privacy: 'private',
      properties: {
        enable_screenshare: true,
        enable_chat: true,
        enable_recording: 'cloud',
        enable_people_ui: true,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600, // room valid 12h
      },
    })
    roomName = room.name as string
    roomUrl = room.url as string
    await admin.from('service_sessions').update({ daily_room_name: roomName, daily_room_url: roomUrl }).eq('id', session.id as string)
  }

  // Mint a per-user meeting token. Staff = owner (can record + admin); student
  // is a normal participant (cannot start recording).
  const token = (await daily('/meeting-tokens', {
    properties: {
      room_name: roomName,
      user_name: caller.name || (isStaff ? 'Mentor' : 'Student'),
      is_owner: isStaff,
      start_cloud_recording: false,
      enable_recording_ui: isStaff,
      eject_at_token_exp: true,
      exp: Math.floor(Date.now() / 1000) + 4 * 3600,
    },
  })) as { token: string }

  return json({ roomUrl, token: token.token, isStaff })
}
