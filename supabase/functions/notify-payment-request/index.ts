// Owner-only. Emails the requester that their service request has been
// priced and is ready to pay. Called right after the owner sets the final
// price, so the customer doesn't have to keep checking the dashboard.
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
const SITE_URL = Deno.env.get('SITE_URL') || 'https://pioneersforresearch.pages.dev'
const CURRENCY_LABEL = (Deno.env.get('STRIPE_CURRENCY') || 'usd').toUpperCase()

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
    console.error('notify-payment-request failed', err)
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

  let body: { requestId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  if (!body.requestId) return json({ error: 'missing requestId' }, 400)

  const { data: request } = await admin
    .from('service_requests')
    .select('id, email, full_name, subject, final_price_cents, service:services(title)')
    .eq('id', body.requestId)
    .maybeSingle()
  if (!request) return json({ error: 'request not found' }, 404)
  if (!request.final_price_cents) return json({ error: 'request has no price set' }, 409)

  if (!SMTP_USER || !SMTP_PASS) return json({ sent: false, reason: 'smtp not configured' })

  const serviceTitle = (request.service as unknown as { title: string } | null)?.title ?? ''
  const amount = (request.final_price_cents / 100).toLocaleString('en-US')

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: SMTP_PORT === 465,
      auth: { username: SMTP_USER, password: SMTP_PASS },
    },
  })
  try {
    // ASCII-only subject — an Arabic one gets encoded-word wrapped and some
    // clients render it as raw source (same reason as the OTP emails).
    await client.send({
      from: SMTP_FROM,
      to: request.email,
      subject: `Pioneers for Research - Payment requested (${amount} ${CURRENCY_LABEL})`,
      content:
        `Your request "${request.subject}" (${serviceTitle}) has been reviewed.\n` +
        `Amount due: ${amount} ${CURRENCY_LABEL}\n` +
        `Pay here: ${SITE_URL}/my-requests\n\n` +
        `مرحبًا ${request.full_name},\n` +
        `راجعنا طلبك "${request.subject}" وحدّدنا المبلغ المطلوب: ${amount} ${CURRENCY_LABEL}\n` +
        `للدفع، افتح صفحة "طلباتي": ${SITE_URL}/my-requests\n` +
        `شكرًا لك.`,
    })
    return json({ sent: true })
  } finally {
    try {
      await client.close()
    } catch {
      // already closed/never opened — ignore
    }
  }
}
