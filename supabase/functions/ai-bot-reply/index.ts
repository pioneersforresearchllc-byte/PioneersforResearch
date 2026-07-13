// Called by the client right after it sends a message into a conversation
// that includes the AI assistant. Fetches recent history, asks Gemini
// (free tier) for a reply, and inserts it as a message from the bot's own
// account (needs the service role since the caller isn't the bot —
// messages_insert requires sender_id = auth.uid()).
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
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const AI_BOT_USERNAME = 'ai-assistant'
// gemini-2.0-flash returned a hard 0-quota error on this project's free
// tier; gemini-1.5-flash has long-standing free-tier availability. Change
// here if you want a different model.
const GEMINI_MODEL = 'gemini-1.5-flash'

const SYSTEM_PROMPT =
  'أنت المساعد الذكي لمنصة "Pioneers for Research" التدريبية على البحث العلمي. ' +
  'ترد على أسئلة الطلاب والمعلمين بخصوص المنصة (الدورات، الواجبات، الشهادات، المقالات، الحساب) وبخصوص البحث العلمي عمومًا. ' +
  'ردودك مختصرة، واضحة، ومفيدة، بالعربية الفصحى المبسّطة إلا إذا كتب المستخدم بالإنجليزية. ' +
  'لو سؤال يحتاج تدخل بشري (دفع، مشكلة تقنية بالحساب، شكوى)، وجّه المستخدم لمراسلة الإدارة مباشرة.'

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
  if (userErr || !user) return json({ error: 'unauthorized' }, 401)

  let body: { conversationId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  const conversationId = body.conversationId
  if (!conversationId) return json({ error: 'missing conversationId' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  // Confirm the caller is actually a member of this conversation (defends
  // against this function being invoked for an arbitrary conversation).
  const { data: membership } = await admin
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return json({ error: 'not a member of this conversation' }, 403)

  const { data: bot } = await admin.from('profiles').select('id').eq('username', AI_BOT_USERNAME).maybeSingle()
  if (!bot) return json({ error: 'ai bot not configured' }, 404)

  const { data: isBotMember } = await admin
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', bot.id)
    .maybeSingle()
  if (!isBotMember) return json({ skipped: true, reason: 'bot not in this conversation' })

  const { data: history } = await admin
    .from('messages')
    .select('sender_id, text, deleted, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(12)

  const contents = (history ?? [])
    .filter((m) => !m.deleted && m.text)
    .reverse()
    .map((m) => ({ role: m.sender_id === bot.id ? 'model' : 'user', parts: [{ text: m.text as string }] }))

  if (contents.length === 0) return json({ skipped: true, reason: 'no text to respond to' })

  const aiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { maxOutputTokens: 700 },
      }),
    },
  )

  if (!aiRes.ok) {
    const errText = await aiRes.text()
    // TEMP diagnostics — list what models this key can actually use.
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`)
    const listText = await listRes.text()
    return json({ error: `ai request failed: ${errText}`, availableModels: listText }, 502)
  }

  const aiData = (await aiRes.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const replyText = (aiData.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('\n')
    .trim()
  if (!replyText) return json({ error: 'empty ai response' }, 502)

  const { error: insertErr } = await admin.from('messages').insert({
    conversation_id: conversationId,
    sender_id: bot.id,
    text: replyText,
  })
  if (insertErr) return json({ error: insertErr.message }, 500)

  return json({ replied: true })
})
