import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/profile'

function SuspendedNotice() {
  const { t } = useLanguage()
  const { signOut } = useAuth()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-soft px-6 text-center">
      <div className="font-heading text-xl font-bold text-navy">{t('login.suspendedTitle')}</div>
      <div className="max-w-sm text-[14px] leading-7 text-muted">{t('login.suspended')}</div>
      <button
        onClick={() => void signOut()}
        className="rounded-lg bg-navy px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-navy-hover"
      >
        {t('shell.signOut')}
      </button>
    </div>
  )
}

/**
 * Client-side route guard. RLS is the real enforcement layer (a user who
 * bypasses this can still only read/write what their role's policies
 * allow) — this just keeps people out of dashboards that aren't theirs.
 *
 * The owner role gets an extra async check: role==='owner' alone isn't
 * enough to enter /owner, since public.is_verified_owner() (what RLS
 * actually gates on) also requires a consumed OTP within the last 12
 * hours — so someone who only completed step 1 of owner login gets sent
 * back to the OTP screen instead of into a dashboard that would 403 on
 * every query.
 */
export function RequireRole({ role }: { role: UserRole }) {
  const { session, profile, loading } = useAuth()
  const [ownerVerified, setOwnerVerified] = useState<boolean | null>(null)

  useEffect(() => {
    if (role !== 'owner' || !session || profile?.role !== 'owner') return
    let active = true
    supabase.rpc('is_verified_owner').then(({ data }) => {
      if (active) setOwnerVerified(Boolean(data))
    })
    return () => {
      active = false
    }
  }, [role, session, profile])

  if (loading) return null
  if (!session || !profile) return <Navigate to="/login" replace />
  if (profile.suspended) return <SuspendedNotice />
  if (profile.role !== role) return <Navigate to="/" replace />
  if (profile.role === 'teacher' && profile.status !== 'active') {
    return <Navigate to="/teacher-pending" replace />
  }
  if (profile.role === 'institution' && profile.status !== 'active') {
    return <Navigate to="/institution-pending" replace />
  }
  if (role === 'owner') {
    if (ownerVerified === null) return null
    if (!ownerVerified) return <Navigate to="/owner-otp" replace />
  }

  return <Outlet />
}
