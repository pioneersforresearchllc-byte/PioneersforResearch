// Owner-only broadcast email. The admin picks an audience (students /
// teachers / everyone), writes a subject + message, and this fans it out to
// every matching account over SMTP, then records the send in admin_broadcasts
// so the Broadcast tab can show a history.
//
// Recipients are BCC'd (never To), in chunks, for two reasons: it hides every
// student's address from the others, and one message with many BCC recipients
// counts far more gently against Gmail's per-message sending limits than one
// message per person would. Sandboxed like the OTP senders: with no
// SMTP_USER/SMTP_PASS configured, nothing is sent and the recipient count is
// still returned so the flow can be exercised in dev.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

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
const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com'
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') || '465')
const SMTP_USER = Deno.env.get('SMTP_USER')
const SMTP_PASS = Deno.env.get('SMTP_PASS')
const SMTP_FROM = Deno.env.get('SMTP_FROM') || SMTP_USER || ''

// Recipients per SMTP message. Kept well under Gmail's per-message recipient
// cap so a large audience goes out in a handful of BCC batches.
const BCC_CHUNK = 90

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  try {
    return await handle(req)
  } catch (err) {
    console.error('admin-broadcast failed', err)
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

  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!me || me.role !== 'owner') return json({ error: 'not an owner account' }, 403)

  let body: { audience?: string; subject?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }

  const audience = body.audience
  const subject = (body.subject || '').trim()
  const message = (body.message || '').trim()
  if (audience !== 'students' && audience !== 'teachers' && audience !== 'all') {
    return json({ error: 'invalid audience' }, 400)
  }
  if (!subject) return json({ error: 'missing subject' }, 400)
  if (!message) return json({ error: 'missing message' }, 400)

  const roles = audience === 'all' ? ['student', 'teacher'] : [audience === 'students' ? 'student' : 'teacher']

  // Only active, non-suspended accounts of the chosen role(s). (Pending or
  // rejected teachers, and suspended users, are deliberately excluded.)
  const { data: profiles, error: profErr } = await admin
    .from('profiles')
    .select('id')
    .in('role', roles)
    .eq('status', 'active')
    .eq('suspended', false)
  if (profErr) return json({ error: profErr.message }, 500)

  const targetIds = new Set((profiles ?? []).map((p) => p.id as string))
  if (targetIds.size === 0) {
    await recordBroadcast(admin, user.id, audience, subject, message, 0)
    return json({ sent: false, recipientCount: 0, reason: 'no recipients' })
  }

  // Emails live in auth.users, not profiles — page through and keep only the
  // addresses that belong to a targeted profile.
  const emails: string[] = []
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) break
    for (const u of data.users) {
      if (u.email && targetIds.has(u.id)) emails.push(u.email)
    }
    if (data.users.length < 1000) break
    page += 1
  }

  const recipientCount = emails.length

  // No SMTP configured (dev/sandbox) — record the intent and report the count
  // without actually sending, matching the OTP senders' behaviour.
  if (!SMTP_USER || !SMTP_PASS) {
    await recordBroadcast(admin, user.id, audience, subject, message, recipientCount)
    return json({ sent: false, recipientCount, reason: 'smtp not configured' })
  }

  if (recipientCount === 0) {
    await recordBroadcast(admin, user.id, audience, subject, message, 0)
    return json({ sent: false, recipientCount: 0, reason: 'no recipients' })
  }

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: SMTP_PORT === 465,
      auth: { username: SMTP_USER, password: SMTP_PASS },
    },
  })

  try {
    // Plain text only (no `html`) — a single text/plain part renders reliably
    // across clients, matching the other senders here. Each batch goes To the
    // sending address itself with the real audience in Bcc.
    for (const batch of chunk(emails, BCC_CHUNK)) {
      await client.send({
        from: SMTP_FROM,
        to: SMTP_FROM,
        bcc: batch,
        subject,
        content: message,
      })
    }
  } finally {
    try {
      await client.close()
    } catch {
      // already closed / never opened — ignore
    }
  }

  await recordBroadcast(admin, user.id, audience, subject, message, recipientCount)
  return json({ sent: true, recipientCount })
}

async function recordBroadcast(
  admin: ReturnType<typeof createClient>,
  senderId: string,
  audience: string,
  subject: string,
  message: string,
  recipientCount: number,
) {
  const { error } = await admin
    .from('admin_broadcasts')
    .insert({ sender_id: senderId, audience, subject, message, recipient_count: recipientCount })
  if (error) console.error('failed to record broadcast', error)
}
