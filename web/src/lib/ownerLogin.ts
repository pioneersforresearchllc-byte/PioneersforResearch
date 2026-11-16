import type { NavigateFunction } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getOwnerDeviceId } from '@/lib/device'

/**
 * Step 2 of an admin login, after the password was accepted. Shared by the
 * admin portal and the main /login page, so an admin who signs in from the
 * main page is carried into the admin flow instead of being turned away.
 *
 * send-otp answers `skipped` for a trusted device or an SCFHS review account
 * (profiles.otp_exempt_until in the future) — those go straight in; everyone
 * else gets the emailed code screen.
 *
 * Returns false only when the code could not be sent (caller shows an error).
 */
export async function continueOwnerLogin(navigate: NavigateFunction, redirect?: string | null): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('send-otp', {
    body: { deviceId: getOwnerDeviceId() },
  })
  if (error) {
    // Non-2xx. A 429 means a code was sent moments ago and is still valid —
    // send them to the code screen rather than dead-ending on an error.
    const ctx = (error as { context?: Response }).context
    if (ctx?.status === 429) {
      navigate('/owner-otp', { state: { devCode: null } })
      return true
    }
    return false
  }
  if ((data as { skipped?: boolean } | null)?.skipped) {
    navigate(redirect && redirect.startsWith('/owner') ? redirect : '/owner')
    return true
  }
  navigate('/owner-otp', { state: { devCode: (data as { devCode?: string } | null)?.devCode ?? null } })
  return true
}
