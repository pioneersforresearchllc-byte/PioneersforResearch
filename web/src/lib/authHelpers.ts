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

/**
 * Tells the owner (email + push + bell, via the site_errors trigger) that a
 * customer hit an error in a critical flow. Best effort, never throws.
 */
export async function reportSiteError(area: string, detail: string, email?: string, userId?: string) {
  try {
    await supabase.from('site_errors').insert({
      area,
      detail: detail.slice(0, 500),
      email: email?.slice(0, 200) ?? null,
      user_id: userId ?? null,
    })
  } catch {
    // reporting must never break the customer's flow
  }
}

export type SignupOtpResult =
  | { kind: 'sent'; devCode: string | null }
  | { kind: 'autoVerified' }
  | { kind: 'invalidEmail' }
  // A code may already be on its way (rate limited / unclear failure) —
  // send the customer to the code page, where they can also resend.
  | { kind: 'goToCodePage' }

/** Calls send-signup-otp right after signUp; never leaves the customer at a dead end. */
export async function requestSignupOtp(email: string, userId: string): Promise<SignupOtpResult> {
  const { data, error } = await supabase.functions.invoke('send-signup-otp')
  if (!error) {
    const result = data as { autoVerified?: boolean; devCode?: string } | null
    if (result?.autoVerified) return { kind: 'autoVerified' }
    return { kind: 'sent', devCode: result?.devCode ?? null }
  }
  const body = await fnErrorBody(error)
  if (body?.error === 'invalid_email') return { kind: 'invalidEmail' }
  if (body?.error !== 'rate_limited') {
    const status = error instanceof FunctionsHttpError ? (error.context as Response).status : 'network'
    await reportSiteError('signup_otp', `${status}: ${String(body?.error ?? error.message)}`, email, userId)
  }
  return { kind: 'goToCodePage' }
}

/** Usernames are a login identifier: no spaces, and no '@' (that would be read as an email). */
export function isValidUsername(username: string): boolean {
  return /^[^\s@]{3,30}$/u.test(username)
}

// PostgREST's "function not found" — the migration adding the RPC hasn't run yet.
const RPC_MISSING = 'PGRST202'

/** True when a profile already owns this username (case-insensitive). */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_username_taken', { p_username: username })
  if (error?.code === RPC_MISSING) {
    // Pre-0064 fallback.
    const { data: email } = await supabase.rpc('resolve_login_identifier', { identifier: username })
    return !!email
  }
  return !!data
}

export type LoginLookup = { email: string } | { error: 'invalid' | 'rate_limited' }

/**
 * Turns a username-or-email into the account email. Since 0064 a username only
 * resolves when the password is right, so usernames can't be used to look up emails.
 */
export async function resolveLoginEmail(identifier: string, password: string): Promise<LoginLookup> {
  const { data, error } = await supabase.rpc('resolve_login', { p_identifier: identifier, p_password: password })
  if (error?.code === RPC_MISSING) {
    const { data: email } = await supabase.rpc('resolve_login_identifier', { identifier })
    return email ? { email: email as string } : { error: 'invalid' }
  }
  const result = data as { email?: string; error?: string } | null
  if (result?.email) return { email: result.email }
  return { error: result?.error === 'rate_limited' ? 'rate_limited' : 'invalid' }
}

export type AbandonedSignupResult = 'cleared' | 'in_use' | 'pending'

/**
 * signUp() said the email exists: ask the server to clear it if it is an
 * abandoned (never-verified) signup. The password proves the retrying person
 * started that signup; otherwise it is only cleared once it has gone stale.
 */
export async function clearAbandonedSignup(email: string, password: string): Promise<AbandonedSignupResult> {
  const { data, error } = await supabase.functions.invoke('reset-unverified-signup', { body: { email, password } })
  const body = (data ?? (await fnErrorBody(error))) as { cleared?: boolean; hasProfile?: boolean; pending?: boolean } | null
  if (body?.hasProfile) return 'in_use'
  if (body?.pending) return 'pending'
  return body?.cleared ? 'cleared' : 'in_use'
}

/** create-profile answers a unique-violation on profiles.username with 409 + the Postgres message. */
export function isUsernameConflict(body: Record<string, unknown> | null): boolean {
  const msg = typeof body?.error === 'string' ? body.error : ''
  return /username|duplicate key/i.test(msg)
}
