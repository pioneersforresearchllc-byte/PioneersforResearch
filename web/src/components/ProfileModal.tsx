import { useEffect, useState } from 'react'
import { fetchPublicProfile, type PublicProfile } from '@/lib/account'
import { useLanguage } from '@/lib/i18n'

function initials(name: string) {
  return name.trim().slice(0, 2) || '?'
}

interface ProfileModalProps {
  userId: string
  onClose: () => void
}

/** Public profile card shown when a user taps someone's avatar anywhere. */
export function ProfileModal({ userId, onClose }: ProfileModalProps) {
  const { t } = useLanguage()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchPublicProfile(userId).then((p) => {
      if (active) {
        setProfile(p)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [userId])

  const roleKey =
    profile?.role === 'teacher' ? 'role.teacher' : profile?.role === 'owner' ? 'role.owner' : 'role.student'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-[420px] overflow-y-auto rounded-2xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="py-10 text-center text-[14px] text-muted">...</div>
        ) : !profile ? (
          <div className="py-10 text-center text-[14px] text-muted">{t('profileCard.private')}</div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="h-20 w-20 rounded-full object-cover" alt="" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#eef1f5] text-2xl font-bold text-navy">
                  {initials(profile.name)}
                </div>
              )}
              <div className="mt-3 font-heading text-lg font-bold text-navy">{profile.name}</div>
              <div className="text-[12.5px] text-muted">@{profile.username}</div>
              <span className="mt-2 rounded-full bg-bg-soft px-3 py-1 text-[12px] font-semibold text-navy">
                {t(roleKey)}
              </span>
            </div>

            {!profile.profile_public ? (
              <div className="mt-5 rounded-lg bg-bg-soft py-6 text-center text-[13.5px] text-muted">
                {t('profileCard.private')}
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-4">
                {profile.bio && (
                  <div>
                    <div className="mb-1 text-[12.5px] font-semibold text-muted">{t('profileCard.bio')}</div>
                    <div className="whitespace-pre-wrap text-[14px] leading-7 text-navy">{profile.bio}</div>
                  </div>
                )}
                {profile.role === 'teacher' && (profile.specialty || profile.qualification) && (
                  <div className="flex flex-col gap-1.5 text-[13.5px]">
                    {profile.specialty && (
                      <div>
                        <span className="text-muted">{t('profileCard.specialty')}: </span>
                        <span className="text-navy">{profile.specialty}</span>
                      </div>
                    )}
                    {profile.qualification && (
                      <div>
                        <span className="text-muted">{t('profileCard.qualification')}: </span>
                        <span className="text-navy">{profile.qualification}</span>
                      </div>
                    )}
                    {profile.years_experience != null && (
                      <div>
                        <span className="text-muted">{t('profileCard.experience')}: </span>
                        <span className="text-navy">{profile.years_experience}</span>
                      </div>
                    )}
                  </div>
                )}
                {profile.role === 'student' && (
                  <div>
                    <div className="mb-2 text-[12.5px] font-semibold text-muted">{t('profileCard.certificates')}</div>
                    {profile.certificates.length === 0 ? (
                      <div className="text-[13px] text-faint">{t('profileCard.noCertificates')}</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {profile.certificates.map((c) =>
                          c.image_url ? (
                            <a key={c.id} href={c.image_url} target="_blank" rel="noreferrer">
                              <img
                                src={c.image_url}
                                className="aspect-[1.4] w-full rounded-md border border-border object-cover"
                                alt={c.course_title}
                              />
                            </a>
                          ) : (
                            <div
                              key={c.id}
                              className="flex aspect-[1.4] items-center justify-center rounded-md border border-border bg-bg-soft p-2 text-center text-[11px] text-muted"
                            >
                              {c.course_title}
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-md border border-border py-2.5 text-[13.5px] text-navy hover:border-navy"
            >
              {t('profileCard.close')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
