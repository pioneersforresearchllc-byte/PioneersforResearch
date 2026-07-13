// Auto-translates Arabic content (course/article titles, descriptions,
// bodies) to English using Gemini's free tier, called client-side right
// after a teacher/owner creates or edits a course or article. Any
// authenticated user may call it — it only translates text they pass in,
// it doesn't touch the database itself.
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
const ANON_KEY = firstFromJsonDict(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')) || Deno.env.get('SUPABASE_ANON_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
// Confirmed working for this API key via the same candidate-list approach
// used in ai-bot-reply (gemini-2.5-flash returned "no longer available to
// new users"; gemini-flash-lite-latest actually responds).
const GEMINI_MODEL = 'gemini-flash-lite-latest'

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

  let body: { texts?: string[] }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }
  const texts = (body.texts ?? []).filter((t) => typeof t === 'string' && t.trim())
  if (texts.length === 0) return json({ translations: [] })

  const prompt =
    'Translate each of the following numbered Arabic texts to natural, professional English. ' +
    'Reply with ONLY a JSON array of strings, same order, same count, no other text.\n\n' +
    texts.map((t, i) => `${i + 1}. ${t}`).join('\n')

  const aiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2000 },
      }),
    },
  )

  if (!aiRes.ok) {
    const errText = await aiRes.text()
    return json({ error: `translation request failed: ${errText}` }, 502)
  }

  const aiData = (await aiRes.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const raw = (aiData.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('')

  let translations: unknown
  try {
    translations = JSON.parse(raw)
  } catch {
    return json({ error: 'could not parse translation response' }, 502)
  }
  if (!Array.isArray(translations) || translations.length !== texts.length) {
    return json({ error: 'translation response shape mismatch' }, 502)
  }

  return json({ translations })
})
