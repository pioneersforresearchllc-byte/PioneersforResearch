// Called by an authenticated student on a paid course's "subscribe" button.
// Creates a Stripe Checkout Session (hosted payment page — no card data
// ever touches our servers or the browser directly) and a matching
// `payments` row with status 'pending'. The actual enrollment only happens
// later, server-side, when stripe-webhook receives the real
// checkout.session.completed event — this function never enrolls anyone
// itself, since a client could otherwise just call it and claim success
// without paying.
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
// Where Stripe sends the customer back after paying. Set the SITE_URL
// secret to override; the default is the live Cloudflare Pages domain.
const SITE_URL = Deno.env.get('SITE_URL') || 'https://pioneersforresearch.pages.dev'
// Keep in sync with create-service-checkout — see the note there on why this
// isn't SAR.
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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'missing authorization' }, 401)

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()
  if (userErr || !user || !user.email) return json({ error: 'unauthorized' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!profile || profile.role !== 'student') return json({ error: 'students only' }, 403)

  let body: { courseId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  const courseId = body.courseId
  if (!courseId) return json({ error: 'missing courseId' }, 400)

  const { data: course } = await admin
    .from('courses')
    .select('id, title, price_cents, capacity')
    .eq('id', courseId)
    .maybeSingle()
  if (!course) return json({ error: 'course not found' }, 404)
  if (course.price_cents <= 0) return json({ error: 'this course is free — use free enrollment instead' }, 400)

  const { data: existing } = await admin
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', user.id)
    .maybeSingle()
  if (existing) return json({ error: 'already enrolled' }, 409)

  if (course.capacity != null) {
    const { count } = await admin
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId)
    if ((count ?? 0) >= course.capacity) return json({ error: 'course is full' }, 409)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: CURRENCY,
          product_data: { name: course.title },
          unit_amount: course.price_cents,
        },
        quantity: 1,
      },
    ],
    success_url: `${SITE_URL}/course/${courseId}?payment=success`,
    cancel_url: `${SITE_URL}/course/${courseId}?payment=cancelled`,
    metadata: { course_id: courseId, student_id: user.id },
  })

  const { error: insertErr } = await admin.from('payments').insert({
    course_id: courseId,
    student_id: user.id,
    amount_cents: course.price_cents,
    provider: 'stripe',
    provider_ref: session.id,
    status: 'pending',
  })
  if (insertErr) return json({ error: insertErr.message }, 500)

  return json({ url: session.url })
})
