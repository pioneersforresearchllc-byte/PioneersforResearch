// Called directly by Stripe's servers, not by our frontend — this is the
// ONLY place that actually creates an enrollment for a paid course. Never
// trust a client-side "payment succeeded" redirect; the browser can be
// closed, spoofed, or lie. Stripe signs every request with STRIPE_WEBHOOK_SECRET
// so we can verify it genuinely came from Stripe before acting on it.
//
// IMPORTANT deployment note: this function's "Verify JWT" setting must be
// turned OFF in the Supabase dashboard (Edge Functions → stripe-webhook →
// settings). Stripe does not send a Supabase auth token, only its own
// Stripe-Signature header — with JWT verification on, Supabase's gateway
// rejects the request before our code (and the signature check below) ever
// runs.
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
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('missing stripe-signature header', { status: 400 })

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return new Response(`signature verification failed: ${err}`, { status: 400 })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const courseId = session.metadata?.course_id
    const studentId = session.metadata?.student_id

    if (courseId && studentId) {
      await admin.from('payments').update({ status: 'completed' }).eq('provider_ref', session.id)

      // Stripe can deliver the same event more than once — ignore a unique
      // violation from an already-existing enrollment instead of erroring.
      const { error: enrollErr } = await admin.from('enrollments').insert({ course_id: courseId, student_id: studentId })
      if (enrollErr && enrollErr.code !== '23505') {
        console.error('enrollment insert failed', enrollErr)
      }
    }
  } else if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session
    await admin.from('payments').update({ status: 'failed' }).eq('provider_ref', session.id)
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'content-type': 'application/json' } })
})
