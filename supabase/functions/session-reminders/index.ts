// Scheduled (cron) function. Every few minutes it looks for service sessions
// that start within the next 15 minutes and haven't been reminded yet, then
// tells the student: an email, an in-site notification (the bell), and a web
// push — exactly once per session (guarded by reminder_sent_at).
//
// Invoke from pg_cron (see the migration notes) every 5 minutes. Protect it
// with a shared secret: set CRON_SECRET and send it as the `x-cron-secret`
// header. Needs the same SMTP_* and VAPID_* secrets the other functions use.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
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
const CRON_SECRET = (Deno.env.get('CRON_SECRET') || '').trim()

const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com'
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') || '465')
const SMTP_USER = Deno.env.get('SMTP_USER')
const SMTP_PASS = Deno.env.get('SMTP_PASS')
const SMTP_FROM = Deno.env.get('SMTP_FROM') || SMTP_USER || ''

const VAPID_PUBLIC_KEY = (
  Deno.env.get('VAPID_PUBLIC_KEY') ||
  'BKmP41ReZGzp5cXehZCyVmXwoBDLhMUVOmZ-O-dx9FPRVwrT4dHt0smbSl7i5m3fDCPTJ77Lep75TiwGoKm7XtM'
).trim()
const VAPID_PRIVATE_KEY = (Deno.env.get('VAPID_PRIVATE_KEY') || '').trim()
const VAPID_SUBJECT = (Deno.env.get('VAPID_SUBJECT') || 'mailto:abbasfakhraddin@gmail.com').trim()

function normalizeSiteUrl(raw: string | undefined): string {
  const trimmed = (raw || '').trim().replace(/\/+$/, '')
  if (!trimmed) return 'https://pioneersforresearch.pages.dev'
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}
const SITE_URL = normalizeSiteUrl(Deno.env.get('SITE_URL'))

const WINDOW_MS = 15 * 60 * 1000 // remind 15 minutes before start
const GRACE_MS = 2 * 60 * 1000 // tolerate a couple minutes of cron drift

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}

// Saudi Arabia is fixed UTC+3 (no DST); sessions are stored in local Saudi time.
function sessionStartMs(date: string, time: string): number {
  const t = time.length === 5 ? `${time}:00` : time
  return Date.parse(`${date}T${t}+03:00`)
}
function fmtTime(time: string): string {
  const [h, m] = time.split(':')
  const hr = Number(h)
  const ampm = hr < 12 ? 'ص' : 'م'
  const h12 = hr % 12 || 12
  return `${h12}:${m} ${ampm}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (CRON_SECRET && req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return json({ error: 'forbidden' }, 403)
  }
  try {
    return await handle()
  } catch (err) {
    console.error('session-reminders failed', err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

async function handle(): Promise<Response> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  const now = Date.now()
  const todayUtc = new Date(now - 24 * 3600 * 1000).toISOString().slice(0, 10)
  const tomorrowUtc = new Date(now + 24 * 3600 * 1000).toISOString().slice(0, 10)

  // Candidate sessions: scheduled, not yet reminded, near today (UTC ±1 day to
  // cover the Saudi offset). We compute the exact instant per row below.
  const { data: sessions } = await admin
    .from('service_sessions')
    .select('id, request_id, title, session_date, session_time')
    .is('reminder_sent_at', null)
    .not('session_date', 'is', null)
    .not('session_time', 'is', null)
    .gte('session_date', todayUtc)
    .lte('session_date', tomorrowUtc)

  const due = (sessions ?? []).filter((s) => {
    const start = sessionStartMs(s.session_date as string, s.session_time as string)
    if (Number.isNaN(start)) return false
    const delta = start - now
    return delta <= WINDOW_MS && delta > -GRACE_MS // within the next 15 min, not long past
  })

  if (due.length === 0) return json({ reminded: 0 })

  const smtp =
    SMTP_USER && SMTP_PASS
      ? new SMTPClient({
          connection: { hostname: SMTP_HOST, port: SMTP_PORT, tls: SMTP_PORT === 465, auth: { username: SMTP_USER, password: SMTP_PASS } },
        })
      : null
  if (VAPID_PRIVATE_KEY) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

  let reminded = 0
  try {
    for (const s of due) {
      const { data: reqRow } = await admin
        .from('service_requests')
        .select('user_id, email, full_name, subject, status, service:services(title)')
        .eq('id', s.request_id as string)
        .maybeSingle()
      if (!reqRow) continue
      if (!['paid', 'in_progress', 'done'].includes(reqRow.status as string)) continue

      const timeStr = fmtTime(s.session_time as string)
      const serviceTitle = (reqRow.service as unknown as { title: string } | null)?.title ?? ''
      const bodyAr = `تبدأ حصتك «${s.title}» الساعة ${timeStr}. جهّز نفسك، وزر «انضم للحصة» يفتح الآن.`

      // (1) In-site notification (the bell) — for the student's account.
      if (reqRow.user_id) {
        try {
          await admin.from('notifications').insert({
            user_id: reqRow.user_id,
            kind: 'session_reminder',
            title: '⏰ حصتك تبدأ بعد قليل — Pioneers',
            body: bodyAr,
            url: '/student/services',
          })
        } catch (err) {
          console.error('reminder notification insert failed', err)
        }
      }

      // (2) Email.
      if (smtp && reqRow.email) {
        try {
          await smtp.send({
            from: SMTP_FROM,
            to: reqRow.email as string,
            subject: 'Pioneers for Research - Your session starts soon',
            content:
              `Reminder: your session "${s.title}" (${serviceTitle}) starts at ${timeStr} (KSA time).\n` +
              `Open "My Services" and click "Join session": ${SITE_URL}/student/services\n\n` +
              `مرحبًا ${reqRow.full_name ?? ''},\n` +
              `تذكير: تبدأ حصتك «${s.title}»${serviceTitle ? ` (${serviceTitle})` : ''} الساعة ${timeStr} بتوقيت السعودية.\n` +
              `افتح صفحة «خدماتي» واضغط «انضم للحصة»: ${SITE_URL}/student/services\n` +
              `نراك في الحصة!`,
          })
        } catch (err) {
          console.error('reminder email failed', err)
        }
      }

      // (3) Web push (best-effort).
      if (VAPID_PRIVATE_KEY && reqRow.user_id) {
        const { data: subs } = await admin
          .from('push_subscriptions')
          .select('id, endpoint, p256dh, auth')
          .eq('user_id', reqRow.user_id)
        const payload = JSON.stringify({
          title: '⏰ حصتك تبدأ بعد قليل — Pioneers',
          body: bodyAr,
          url: '/student/services',
          tag: `session_reminder:${s.id}`,
        })
        for (const sub of subs ?? []) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth as string } },
              payload,
            )
          } catch (err) {
            const code = (err as { statusCode?: number }).statusCode
            if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('id', sub.id as string)
          }
        }
      }

      // Mark done so we never remind twice.
      await admin.from('service_sessions').update({ reminder_sent_at: new Date().toISOString() }).eq('id', s.id as string)
      reminded += 1
    }
  } finally {
    if (smtp) {
      try {
        await smtp.close()
      } catch {
        // ignore
      }
    }
  }

  return json({ reminded })
}
