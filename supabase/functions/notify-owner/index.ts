// Alerts every owner the moment something needs them: a new service request,
// contact/quote message, institution consultation, teacher/institution
// application, uploaded payment receipt, or customer review.
//
// Called by database triggers (migration 0068) through pg_net with
// { source, id } — deployed with Verify JWT OFF because the database calls it.
// It can't be abused to spam: it only acts on a row that really exists in the
// named table, was created in the last 15 minutes, and has not been alerted
// before (owner_alerts is the once-only ledger). It sends:
//   - an in-app notification (dashboard bell) to each owner,
//   - a Web Push to each owner's subscribed devices,
//   - an email to each owner's account address.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
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
const SITE_URL = (Deno.env.get('SITE_URL') || 'https://pioneersresearch.com').trim().replace(/\/+$/, '')

const VAPID_PUBLIC_KEY = (
  Deno.env.get('VAPID_PUBLIC_KEY') ||
  'BKmP41ReZGzp5cXehZCyVmXwoBDLhMUVOmZ-O-dx9FPRVwrT4dHt0smbSl7i5m3fDCPTJ77Lep75TiwGoKm7XtM'
).trim()
const VAPID_PRIVATE_KEY = (Deno.env.get('VAPID_PRIVATE_KEY') || '').trim()
const VAPID_SUBJECT = (Deno.env.get('VAPID_SUBJECT') || 'mailto:abbasfakhraddin@gmail.com').trim()

const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com'
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') || '465')
const SMTP_USER = Deno.env.get('SMTP_USER')
const SMTP_PASS = Deno.env.get('SMTP_PASS')
const SMTP_FROM = Deno.env.get('SMTP_FROM') || SMTP_USER || ''

const FRESH_MS = 15 * 60 * 1000

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

type Row = Record<string, unknown>
interface Alert {
  title: string
  body: string
  path: string
}

const SOURCES: Record<string, { table: string; freshCol: string; build: (r: Row) => Alert | null }> = {
  service_request: {
    table: 'service_requests',
    freshCol: 'created_at',
    build: (r) => ({
      title: '🗂️ طلب خدمة جديد',
      body: `${r.full_name || 'عميل'} — ${r.subject || ''}`.trim(),
      path: '/owner/service-requests',
    }),
  },
  contact: {
    table: 'contact_messages',
    freshCol: 'created_at',
    build: (r) => {
      const msg = String(r.message || '')
      const quote = msg.startsWith('طلب عرض سعر') || msg.startsWith('Quote request')
      return {
        title: quote ? '💬 طلب عرض سعر جديد' : '✉️ رسالة تواصل جديدة',
        body: `${r.name || ''}: ${msg.replace(/\s+/g, ' ').slice(0, 140)}`,
        path: '/owner/contact',
      }
    },
  },
  consultation: {
    table: 'institution_consultations',
    freshCol: 'created_at',
    build: (r) => ({ title: '📋 استشارة مؤسسة جديدة', body: String(r.title || ''), path: '/owner/institution-consultations' }),
  },
  application: {
    table: 'profiles',
    freshCol: 'created_at',
    build: (r) =>
      r.role === 'teacher'
        ? { title: '🧑‍🏫 طلب انضمام مدرّب', body: String(r.name || ''), path: '/owner/applications' }
        : r.role === 'institution'
          ? { title: '🏛️ تسجيل مؤسسة جديدة', body: String(r.name || ''), path: '/owner/institutions' }
          : null,
  },
  receipt: {
    table: 'student_invoices',
    freshCol: 'receipt_submitted_at',
    build: (r) => ({ title: '🧾 إيصال دفع بانتظار التأكيد', body: String(r.title || ''), path: '/owner/billing' }),
  },
  review: {
    table: 'testimonials',
    freshCol: 'created_at',
    build: (r) => ({ title: '⭐ رأي عميل بانتظار الموافقة', body: `${r.name || ''}: ${String(r.body || '').slice(0, 120)}`, path: '/owner/reviews' }),
  },
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  let body: { source?: string; id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const src = SOURCES[body.source || '']
  if (!src || !body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return json({ error: 'bad request' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: row } = await admin.from(src.table).select('*').eq('id', body.id).maybeSingle()
  if (!row) return json({ skipped: 'not found' })
  const fresh = row[src.freshCol] ? Date.now() - new Date(String(row[src.freshCol])).getTime() < FRESH_MS : false
  if (!fresh) return json({ skipped: 'not fresh' })
  const alert = src.build(row)
  if (!alert) return json({ skipped: 'not applicable' })

  // Once-only: the ledger insert wins exactly once per (source, row).
  const { data: claimed } = await admin
    .from('owner_alerts')
    .upsert({ source: body.source, row_id: body.id }, { onConflict: 'source,row_id', ignoreDuplicates: true })
    .select('row_id')
  if (!claimed || claimed.length === 0) return json({ skipped: 'already alerted' })

  const { data: owners } = await admin.from('profiles').select('id').eq('role', 'owner')
  const ownerIds = (owners ?? []).map((o) => o.id as string)
  if (ownerIds.length === 0) return json({ skipped: 'no owners' })

  const result = { inApp: 0, push: 0, email: 0 }

  // 1. Dashboard bell
  const { error: nErr } = await admin.from('notifications').insert(
    ownerIds.map((uid) => ({ user_id: uid, kind: `owner_${body.source}`, title: alert.title, body: alert.body, url: alert.path })),
  )
  if (!nErr) result.inApp = ownerIds.length

  // 2. Web Push
  if (VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', ownerIds)
    const dead: string[] = []
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
          JSON.stringify({ title: alert.title, body: alert.body, url: alert.path, tag: `owner:${body.source}:${body.id}` }),
        )
        result.push += 1
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) dead.push(s.id as string)
      }
    }
    if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead)
  }

  // 3. Email
  if (SMTP_USER && SMTP_PASS) {
    const emails: string[] = []
    for (const uid of ownerIds) {
      const { data } = await admin.auth.admin.getUserById(uid)
      const e = data?.user?.email
      if (e && !e.endsWith('.invalid')) emails.push(e)
    }
    if (emails.length) {
      const client = new SMTPClient({
        connection: { hostname: SMTP_HOST, port: SMTP_PORT, tls: SMTP_PORT === 465, auth: { username: SMTP_USER, password: SMTP_PASS } },
      })
      try {
        for (const to of emails) {
          await client.send({
            from: SMTP_FROM,
            to,
            subject: `${alert.title} — Pioneers Health Research`,
            content: `${alert.title}\n\n${alert.body}\n\nافتح لوحة الإدارة: ${SITE_URL}${alert.path}`,
          })
          result.email += 1
        }
      } catch (err) {
        console.error('owner alert email failed', err)
      } finally {
        await client.close()
      }
    }
  }

  return json({ alerted: true, ...result })
})
