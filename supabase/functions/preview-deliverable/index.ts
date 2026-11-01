// Secure, watermarked PREVIEW of a final deliverable (PDF only).
//
// The clean original never leaves the server: this function reads it with the
// service role, stamps a tiled, per-client watermark (phone/email + date) on
// every page with pdf-lib, and returns ONLY the watermarked bytes. The browser
// renders them in-site with pdf.js and no download control — so before the
// final payment a client can READ the work but not take a clean copy, and any
// screenshot is watermarked and traceable to them.
//
// Access: the request's own client, its assigned trainer, or an owner. The
// clean download stays gated by the storage policy (request_is_settled); this
// preview is deliberately available before payment, which is its whole point.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, degrees, rgb } from 'npm:pdf-lib@1.17.1'

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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const err = (m: string, s = 400) =>
  new Response(JSON.stringify({ error: m }), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return err('method not allowed', 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return err('missing authorization', 401)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const {
      data: { user },
      error: uErr,
    } = await userClient.auth.getUser()
    if (uErr || !user) return err('unauthorized', 401)

    let body: { deliverableId?: string }
    try {
      body = await req.json()
    } catch {
      return err('invalid json body', 400)
    }
    const deliverableId = body.deliverableId
    if (!deliverableId) return err('missing deliverableId', 400)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

    const { data: d } = await admin
      .from('service_deliverables')
      .select('id, path, file_name, request_id')
      .eq('id', deliverableId)
      .maybeSingle()
    if (!d) return err('not found', 404)

    const { data: r } = await admin
      .from('service_requests')
      .select('id, user_id, full_name, phone, email, assigned_teacher_id')
      .eq('id', d.request_id)
      .maybeSingle()
    if (!r) return err('request not found', 404)

    // Only the client, the assigned trainer, or an owner may preview.
    let allowed = user.id === r.user_id || user.id === r.assigned_teacher_id
    if (!allowed) {
      const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
      allowed = prof?.role === 'owner'
    }
    if (!allowed) return err('forbidden', 403)

    if (!/\.pdf$/i.test(d.path)) return err('preview supports PDF only', 415)

    const { data: file, error: dlErr } = await admin.storage.from('service-files').download(d.path)
    if (dlErr || !file) return err('could not read file', 500)
    const bytes = new Uint8Array(await file.arrayBuffer())

    // ASCII-only stamp (Helvetica can't render Arabic) — phone/email + date
    // uniquely identify the client, which is all the watermark needs to trace.
    const who = (r.phone || r.email || '').replace(/[^\x20-\x7E]/g, '').trim()
    const stamp = `${who ? who + '  -  ' : ''}${new Date().toISOString().slice(0, 10)}  -  PREVIEW`

    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const size = 11
    for (const page of pdf.getPages()) {
      const { width, height } = page.getSize()
      const stepX = 240
      const stepY = 160
      for (let y = -20; y < height + stepY; y += stepY) {
        for (let x = -60; x < width + stepX; x += stepX) {
          page.drawText(stamp, { x, y, size, font, color: rgb(0.5, 0.5, 0.5), rotate: degrees(45), opacity: 0.16 })
        }
      }
    }
    const out = await pdf.save()
    return new Response(out, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store', ...CORS },
    })
  } catch (e) {
    console.error('preview-deliverable failed', e)
    return err(e instanceof Error ? e.message : String(e), 500)
  }
})
