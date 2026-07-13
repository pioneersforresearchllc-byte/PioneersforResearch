import { supabase } from '@/lib/supabase'

// Fire-and-forget: translates the given Arabic texts to English via the
// translate-text Edge Function (Gemini) and returns them in the same
// order. Callers should not block their save flow on this — call it after
// the row is already saved, then patch in the _en columns once it resolves.
export async function translateTexts(texts: string[]): Promise<string[] | null> {
  const { data, error } = await supabase.functions.invoke('translate-text', { body: { texts } })
  if (error) return null
  const translations = (data as { translations?: unknown })?.translations
  if (!Array.isArray(translations)) return null
  return translations as string[]
}
