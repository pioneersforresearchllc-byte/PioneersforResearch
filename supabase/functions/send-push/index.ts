// Sends a Web Push notification for a specific in-app event. The client never
// chooses the recipients or the text — it only names the event by type + id,
// and this function resolves who to notify (and what to say) server-side after
// checking the caller is actually allowed to trigger that event's notification.
// This keeps a logged-in user from spamming arbitrary people with arbitrary
// text.
//
// Event types:
//   { type: 'chat',            id: <conversationId> } — caller must be a member;
//        notifies the other member(s).
//   { type: 'grade',           id: <submissionId> }   — caller must be teacher/
//        owner; notifies the student whose submission it is.
//   { type: 'certificate',     id: <issuanceId> }     — caller must be teacher/
//        owner; notifies the student it was issued to.
//   { type: 'service_request', id: <requestId> }      — caller must be owner;
//        notifies the request's owner (if it belongs to a registered account).
//
// Needs Supabase secrets: VAPID_PRIVATE_KEY (required), VAPID_PUBLIC_KEY and
// VAPID_SUBJECT (optional — sensible fallbacks below). Dead subscriptions
// (HTTP 404/410) are pruned as we go.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

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

const VAPID_PUBLIC_KEY =
  Deno.env.get('VAPID_PUBLIC_KEY') ||
  'BARWGwQjMoR3aaUov5vw7-aO7YaPqMKAvNk3vlqp35CwCPetwRcQLLlUhd3P1k-gt4VKMnBH7aeWUz4zTGsFgB8'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:abbasfakhraddin@gmail.com'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}

type Admin = ReturnType<typeof createClient>

function chatPathForRole(role: string): string {
  if (role === 'student') return '/student/chat'
  if (role === 'teacher') return '/teacher/chat'
  if (role === 'owner') return '/owner/messages'
  return '/'
}

interface Resolved {
  userIds: string[]
  title: string
  body: string
  // Per-recipient URL. Given a recipient's role, returns where the click lands.
  urlFor: (role: string) => string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  try {
    return await handle(req)
  } catch (err) {
    console.error('send-push failed', err)
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

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: caller } = await admin.from('profiles').select('id, name, role').eq('id', user.id).maybeSingle()
  if (!caller) return json({ error: 'no profile' }, 403)

  let body: { type?: string; id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  if (!body.type || !body.id) return json({ error: 'missing type/id' }, 400)

  const resolved = await resolve(admin, caller as { id: string; name: string; role: string }, body.type, body.id)
  if (!resolved) return json({ error: 'not authorized for this notification' }, 403)
  if (resolved.userIds.length === 0) return json({ sent: 0, reason: 'no recipients' })

  if (!VAPID_PRIVATE_KEY) return json({ sent: 0, reason: 'vapid not configured' })
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

  // Roles of the recipients, to build each one's deep link.
  const { data: recipProfiles } = await admin.from('profiles').select('id, role').in('id', resolved.userIds)
  const roleById = new Map((recipProfiles ?? []).map((p) => [p.id as string, p.role as string]))

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', resolved.userIds)
  if (!subs || subs.length === 0) return json({ sent: 0, reason: 'no subscriptions' })

  let sent = 0
  const deadIds: string[] = []
  for (const s of subs) {
    const url = resolved.urlFor(roleById.get(s.user_id as string) || '')
    const payload = JSON.stringify({ title: resolved.title, body: resolved.body, url, tag: `${body.type}:${body.id}` })
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
        payload,
      )
      sent += 1
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) deadIds.push(s.id as string)
      else console.error('push send error', code, err)
    }
  }
  if (deadIds.length) await admin.from('push_subscriptions').delete().in('id', deadIds)

  return json({ sent, pruned: deadIds.length })
}

async function resolve(
  admin: Admin,
  caller: { id: string; name: string; role: string },
  type: string,
  id: string,
): Promise<Resolved | null> {
  if (type === 'chat') {
    const { data: mine } = await admin
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', id)
      .eq('user_id', caller.id)
      .maybeSingle()
    if (!mine) return null
    const { data: members } = await admin.from('conversation_members').select('user_id').eq('conversation_id', id)
    const others = (members ?? []).map((m) => m.user_id as string).filter((uid) => uid !== caller.id)
    return {
      userIds: others,
      title: 'رسالة جديدة — Pioneers',
      body: `${caller.name}: أرسل لك رسالة`,
      urlFor: chatPathForRole,
    }
  }

  if (type === 'grade') {
    if (caller.role !== 'owner' && caller.role !== 'teacher') return null
    const { data: sub } = await admin.from('submissions').select('student_id').eq('id', id).maybeSingle()
    if (!sub?.student_id) return null
    return {
      userIds: [sub.student_id as string],
      title: 'تم رصد درجتك — Pioneers',
      body: 'تم تصحيح واجبك ورصد الدرجة. اضغط لعرض التفاصيل.',
      urlFor: () => '/student/grades',
    }
  }

  if (type === 'certificate') {
    if (caller.role !== 'owner' && caller.role !== 'teacher') return null
    const { data: iss } = await admin.from('certificate_issuances').select('student_id').eq('id', id).maybeSingle()
    if (!iss?.student_id) return null
    return {
      userIds: [iss.student_id as string],
      title: '🎉 حصلت على شهادة — Pioneers',
      body: 'تم إصدار شهادة جديدة باسمك. اضغط لعرضها وتنزيلها.',
      urlFor: () => '/student/certificates',
    }
  }

  if (type === 'service_request') {
    if (caller.role !== 'owner') return null
    const { data: reqRow } = await admin.from('service_requests').select('user_id').eq('id', id).maybeSingle()
    if (!reqRow?.user_id) return null
    return {
      userIds: [reqRow.user_id as string],
      title: 'تحديث على طلبك — Pioneers',
      body: 'طرأ تحديث على أحد طلباتك. اضغط لعرض الحالة.',
      urlFor: () => '/my-requests',
    }
  }

  return null
}
