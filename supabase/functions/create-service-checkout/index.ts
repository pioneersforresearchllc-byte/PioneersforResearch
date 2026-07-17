// Called by the requester on their own priced service request. Creates a
// Stripe Checkout Session and a matching `payments` row with status
// 'pending'. It never marks the request paid itself — only stripe-webhook
// does that, when Stripe's signed event confirms the money actually moved.
import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'

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
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') || 'https://pioneersforresearch.pages.dev'

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

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
    // Without this, any throw (a rejected Stripe call, a bad key) escapes as
    // a runtime 500 with no CORS headers, which the browser blocks — the
    // client then only sees an opaque "failed to send a request".
    console.error('create-service-checkout failed', err)
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
  if (userErr || !user || !user.email) return json({ error: 'unauthorized' }, 401)

  let body: { requestId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  const requestId = body.requestId
  if (!requestId) return json({ error: 'missing requestId' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: request } = await admin
    .from('service_requests')
    .select('id, user_id, subject, status, final_price_cents, service:services(title)')
    .eq('id', requestId)
    .maybeSingle()
  if (!request) return json({ error: 'request not found' }, 404)

  // Only the person who filed it may pay for it.
  if (request.user_id !== user.id) return json({ error: 'not your request' }, 403)
  if (request.status !== 'awaiting_payment') return json({ error: 'request is not awaiting payment' }, 409)
  if (!request.final_price_cents || request.final_price_cents <= 0) {
    return json({ error: 'request has no price set' }, 409)
  }

  const serviceTitle = (request.service as unknown as { title: string } | null)?.title ?? 'Service'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: 'sar',
          product_data: { name: `${serviceTitle} — ${request.subject}` },
          unit_amount: request.final_price_cents,
        },
        quantity: 1,
      },
    ],
    success_url: `${SITE_URL}/my-requests?payment=success`,
    cancel_url: `${SITE_URL}/my-requests?payment=cancelled`,
    metadata: { service_request_id: requestId, user_id: user.id },
  })

  const { error: insertErr } = await admin.from('payments').insert({
    service_request_id: requestId,
    student_id: user.id,
    amount_cents: request.final_price_cents,
    provider: 'stripe',
    provider_ref: session.id,
    status: 'pending',
  })
  if (insertErr) return json({ error: insertErr.message }, 500)

  return json({ url: session.url })
}
