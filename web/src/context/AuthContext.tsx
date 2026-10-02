import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { fetchProfile } from '@/lib/profile'
import { applyStoredReferral } from '@/lib/referral'
import type { Profile } from '@/types/profile'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    // Tracks whose profile is loaded so a sign-in as a *different* user blocks
    // route guards (loading=true) until that user's profile arrives, instead of
    // them seeing session-without-profile and bouncing back to /login.
    let loadedFor: string | null = null

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) {
        setProfile(await fetchProfile(data.session.user.id))
        loadedFor = data.session.user.id
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) {
        loadedFor = null
        setProfile(null)
        return
      }
      const userId = nextSession.user.id
      const isNewUser = userId !== loadedFor
      if (isNewUser) setLoading(true)
      // Supabase warns against awaiting other supabase calls inside this
      // callback (it can deadlock the auth lock), so defer the fetch.
      setTimeout(() => {
        void fetchProfile(userId).then((p) => {
          if (!active) return
          loadedFor = userId
          setProfile(p)
          if (isNewUser) setLoading(false)
        })
      }, 0)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // A new student who arrived via a referral link: credit the referrer once
  // their profile exists (no-op when no referral was captured).
  useEffect(() => {
    if (profile?.role === 'student') void applyStoredReferral()
  }, [profile?.id, profile?.role])

  // Reads the live session rather than this render's `session`, so callers that
  // just signed up (and captured refreshProfile before the session existed) still work.
  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) setProfile(await fetchProfile(data.session.user.id))
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
