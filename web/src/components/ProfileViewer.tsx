import { createContext, useContext, useState, type ReactNode } from 'react'
import { ProfileModal } from '@/components/ProfileModal'

interface ProfileViewerValue {
  openProfile: (userId: string) => void
}

const ProfileViewerContext = createContext<ProfileViewerValue | undefined>(undefined)

/** Mounted once at the app root so any Avatar can open a profile card. */
export function ProfileViewerProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  return (
    <ProfileViewerContext.Provider value={{ openProfile: setUserId }}>
      {children}
      {userId && <ProfileModal userId={userId} onClose={() => setUserId(null)} />}
    </ProfileViewerContext.Provider>
  )
}

export function useProfileViewer() {
  const ctx = useContext(ProfileViewerContext)
  if (!ctx) throw new Error('useProfileViewer must be used within ProfileViewerProvider')
  return ctx
}
