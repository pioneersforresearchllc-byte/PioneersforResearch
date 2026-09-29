import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/**
 * supabase.functions.invoke() puts a non-2xx response in `error` and leaves
 * `data` null, so codes like 'invalid_email' / 'rate_limited' / a 409 are
 * only readable from the response body carried on the error.
 */
export async function fnErrorBody(err: unknown): Promise<Record<string, unknown> | null> {
  if (err instanceof FunctionsHttpError) {
    try {
      return (await err.context.json()) as Record<string, unknown>
    } catch {
      return null
    }
  }
  return null
}

/** Usernames are a login identifier: no spaces, and no '@' (that would be read as an email). */
export function isValidUsername(username: string): boolean {
  return /^[^\s@]{3,30}$/u.test(username)
}

/** True when a profile already owns this username (reuses the anon-callable login resolver). */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const { data } = await supabase.rpc('resolve_login_identifier', { identifier: username })
  return !!data
}

/** create-profile answers a unique-violation on profiles.username with 409 + the Postgres message. */
export function isUsernameConflict(body: Record<string, unknown> | null): boolean {
  const msg = typeof body?.error === 'string' ? body.error : ''
  return /username|duplicate key/i.test(msg)
}
