// Mints a Daily meeting token for a GROUP workshop room, after verifying the
// caller may join (the workshop's host, a verified owner, or a registered
// account holder). The Daily room is created on first join with knocking
// enabled, so everyone except the host lands in a host-admitted waiting room.
// The host joins as owner (admits people, can record); registered participants
// join with camera + mic (interactive) but must be let in first.
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
// Cloud recording is a PAID Daily feature. Off by default so the free plan
// works; set the secret DAILY_RECORDING=cloud once on a paid plan to enable it.
const RECORDING_ENABLED = (Deno.env.get('DAILY_RECORDING') || '').trim() === 'cloud'
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
    console.error('create-group-call-token failed', err)
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
    .from('group_sessions')
    .select('id, title, status, capacity, host_id, daily_room_name, daily_room_url, scheduled_at, duration_min')
    .eq('id', body.sessionId)
    .maybeSingle()
  if (!session) return json({ error: 'session not found' }, 404)
  if (session.status === 'ended' || session.status === 'cancelled') return json({ error: 'session closed' }, 409)

  const isHost = caller.id === session.host_id || caller.role === 'owner'

  // Non-hosts must hold a reservation for this workshop.
  if (!isHost) {
    const { data: signup } = await admin
      .from('group_session_signups')
      .select('session_id')
      .eq('session_id', session.id as string)
      .eq('user_id', caller.id as string)
      .maybeSingle()
    if (!signup) return json({ error: 'not allowed' }, 403)
  }

  // Ensure a Daily room exists for this workshop (create once, then cache).
  // enable_knocking gives non-owners a waiting room the host must admit them
  // from. The room stays valid past the scheduled end plus a buffer.
  let roomName = session.daily_room_name as string | null
  let roomUrl = session.daily_room_url as string | null
  if (!roomName || !roomUrl) {
    const startMs = session.scheduled_at ? new Date(session.scheduled_at as string).getTime() : Date.now()
    const endMs = startMs + ((session.duration_min as number) || 60) * 60 * 1000 + 60 * 60 * 1000 // + 1h buffer
    const room = await daily('/rooms', {
      privacy: 'private',
      properties: {
        enable_knocking: true,
        enable_screenshare: true,
        enable_chat: true,
        enable_people_ui: true,
        start_video_off: false,
        start_audio_off: false,
        ...(RECORDING_ENABLED ? { enable_recording: 'cloud' } : {}),
        exp: Math.floor(endMs / 1000),
      },
    })
    roomName = room.name as string
    roomUrl = room.url as string
    await admin.from('group_sessions').update({ daily_room_name: roomName, daily_room_url: roomUrl }).eq('id', session.id as string)
  }

  // Mint a per-user token. Host = owner (auto-admitted, can admit others +
  // record). Participant = non-owner, so Daily makes them knock and wait.
  const token = (await daily('/meeting-tokens', {
    properties: {
      room_name: roomName,
      user_name: caller.name || (isHost ? 'Host' : 'Guest'),
      user_id: caller.id,
      is_owner: isHost,
      enable_recording_ui: RECORDING_ENABLED && isHost,
      start_video_off: false,
      start_audio_off: !isHost, // guests start muted; host opens the room
      eject_at_token_exp: true,
      exp: Math.floor(Date.now() / 1000) + 6 * 3600,
    },
  })) as { token: string }

  // Record attendance for a joining participant (first join wins).
  if (!isHost) {
    await admin
      .from('group_session_signups')
      .update({ joined_at: new Date().toISOString() })
      .eq('session_id', session.id as string)
      .eq('user_id', caller.id as string)
      .is('joined_at', null)
  }

  return json({ roomUrl, token: token.token, isHost, title: session.title })
}
