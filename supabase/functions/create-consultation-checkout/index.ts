// An institution pays for a priced consultation by card. Creates a Stripe
// Checkout Session plus an 'unpaid' invoice row; only stripe-webhook marks it
// paid, so a client-side "success" redirect can never fake a payment.
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
function normalizeSiteUrl(raw: string | undefined): string {
  const trimmed = (raw || '').trim().replace(/\/+$/, '')
  if (!trimmed) return 'https://pioneersresearch.com'
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}
const SITE_URL = normalizeSiteUrl(Deno.env.get('SITE_URL'))
const CURRENCY = (Deno.env.get('STRIPE_CURRENCY') || 'usd').toLowerCase()

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
    console.error('create-consultation-checkout failed', err)
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

  let body: { consultationId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  const consultationId = body.consultationId
  if (!consultationId) return json({ error: 'missing consultationId' }, 400)

  // Must belong to the caller's own institution.
  const { data: institutionId } = await userClient.rpc('current_institution_id')
  if (!institutionId) return json({ error: 'no institution' }, 403)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: consultation } = await admin
    .from('institution_consultations')
    .select('id, institution_id, title, final_price_cents, status')
    .eq('id', consultationId)
    .maybeSingle()
  if (!consultation) return json({ error: 'consultation not found' }, 404)
  if (consultation.institution_id !== institutionId) return json({ error: 'not your consultation' }, 403)
  if (consultation.status !== 'awaiting_payment') return json({ error: 'not awaiting payment' }, 409)
  if (!consultation.final_price_cents || consultation.final_price_cents <= 0) {
    return json({ error: 'no price set' }, 409)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: CURRENCY,
          product_data: { name: consultation.title },
          unit_amount: consultation.final_price_cents,
        },
        quantity: 1,
      },
    ],
    success_url: `${SITE_URL}/institution/consultations?payment=success`,
    cancel_url: `${SITE_URL}/institution/consultations?payment=cancelled`,
    metadata: { consultation_id: consultationId, institution_id: institutionId },
  })

  const { error: invoiceErr } = await admin.from('institution_invoices').insert({
    institution_id: institutionId,
    consultation_id: consultationId,
    amount_cents: consultation.final_price_cents,
    method: 'stripe',
    status: 'unpaid',
    provider_ref: session.id,
  })
  if (invoiceErr) return json({ error: invoiceErr.message }, 500)

  return json({ url: session.url })
}
