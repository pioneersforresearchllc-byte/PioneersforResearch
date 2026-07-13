// One-time owner-only setup: creates the AI assistant's account (role
// 'teacher' so the existing DM business rule — "a DM needs at least one
// teacher/owner" — is satisfied whether a student or a teacher starts the
// conversation). Safe to call more than once; no-ops if it already exists.
import { createClient } from 'npm:@supabase/supabase-js@2'

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

export const AI_BOT_USERNAME = 'ai-assistant'
const AI_BOT_EMAIL = 'ai-assistant@internal.pioneersforresearch.invalid'
// No emoji in the name: Avatar's fallback does name.charAt(0) for the
// placeholder letter, and charAt() on an emoji grabs half a UTF-16
// surrogate pair, rendering as a broken glyph.
const AI_BOT_NAME = 'المساعد الذكي'

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
  const { data: isOwner } = await userClient.rpc('is_verified_owner')
  if (!isOwner) return json({ error: 'not a verified owner' }, 403)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: existing } = await admin.from('profiles').select('id').eq('username', AI_BOT_USERNAME).maybeSingle()
  if (existing) return json({ profile: existing, created: false })

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: AI_BOT_EMAIL,
    password: crypto.randomUUID(),
    email_confirm: true,
  })
  if (createErr || !created.user) return json({ error: createErr?.message ?? 'تعذر إنشاء حساب البوت' }, 400)

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .insert({ id: created.user.id, role: 'teacher', status: 'active', name: AI_BOT_NAME, username: AI_BOT_USERNAME })
    .select('*')
    .single()
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id)
    return json({ error: profileErr.message }, 500)
  }

  return json({ profile, created: true })
})
