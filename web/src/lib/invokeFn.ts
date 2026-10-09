import { supabase } from '@/lib/supabase'

/**
 * Calls an Edge Function and always returns its JSON body — including on
 * non-2xx replies. supabase.functions.invoke() sets data=null for 4xx/5xx and
 * hides the body in error.context, so { error: 'rate_limited' } (429) or
 * { error: 'email_not_found' } (404) would otherwise be lost.
 */
export async function invokeFn<T extends object>(name: string, body: Record<string, unknown>): Promise<(T & { error?: string }) | null> {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (!error) return data as T
  const ctx = (error as { context?: Response }).context
  if (ctx && typeof ctx.json === 'function') {
    try {
      return (await ctx.json()) as T & { error?: string }
    } catch {
      // not JSON — fall through
    }
  }
  return null
}
