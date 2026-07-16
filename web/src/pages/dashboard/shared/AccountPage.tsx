import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { changePassword, updateAvatarUrl, updateProfileDetails, uploadAvatar } from '@/lib/account'

function initials(name: string) {
  return name.trim().slice(0, 2) || '?'
}

export function AccountPage() {
  const { profile, refreshProfile } = useAuth()
  const { t } = useLanguage()
  const [name, setName] = useState(profile?.name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [isPublic, setIsPublic] = useState(profile?.profile_public ?? true)
  const [newPassword, setNewPassword] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)
  const [passBusy, setPassBusy] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [passMessage, setPassMessage] = useState('')

  if (!profile) return null

  const saveProfile = async () => {
    if (!name.trim()) return
    setProfileBusy(true)
    setProfileMessage('')
    try {
      await updateProfileDetails(profile.id, {
        name: name.trim(),
        bio: bio.trim() || null,
        profile_public: isPublic,
      })
      await refreshProfile()
      setProfileMessage(t('account.saved'))
    } catch (e) {
      setProfileMessage(e instanceof Error ? e.message : t('account.saveFailed'))
    } finally {
      setProfileBusy(false)
    }
  }

  const handleAvatar = async (file: File) => {
    setProfileBusy(true)
    try {
      const url = await uploadAvatar(profile.id, file)
      await updateAvatarUrl(profile.id, url)
      await refreshProfile()
    } finally {
      setProfileBusy(false)
    }
  }

  const savePassword = async () => {
    if (newPassword.length < 6) {
      setPassMessage(t('account.passwordLength'))
      return
    }
    setPassBusy(true)
    setPassMessage('')
    try {
      await changePassword(newPassword)
      setNewPassword('')
      setPassMessage(t('account.passwordChanged'))
    } catch (e) {
      setPassMessage(e instanceof Error ? e.message : t('account.passwordFailed'))
    } finally {
      setPassBusy(false)
    }
  }

  return (
    <div className="max-w-140">
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('account.title')}</div>

      <div className="mb-6 rounded-xl border border-border bg-white p-5 md:p-6">
        <div className="mb-4 text-[14px] font-semibold text-navy">{t('account.profileSection')}</div>

        <div className="mb-5 flex items-center gap-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} className="h-16 w-16 rounded-full object-cover" alt="" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eef1f5] text-xl font-bold text-navy">
              {initials(profile.name)}
            </div>
          )}
          <label className="cursor-pointer rounded-md border border-border px-4 py-2 text-[13px] text-navy hover:border-navy">
            {t('account.changePhoto')}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && void handleAvatar(e.target.files[0])}
            />
          </label>
        </div>

        <div className="mb-3 text-[12.5px] text-muted">@{profile.username}</div>

        <label className="mb-1.5 block text-[12.5px] font-semibold text-muted">{t('account.namePh')}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-md border border-border px-3.5 py-2.5 text-[14px]"
        />

        <label className="mb-1.5 block text-[12.5px] font-semibold text-muted">{t('account.bioLabel')}</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={t('account.bioPh')}
          rows={3}
          className="mb-4 w-full resize-y rounded-md border border-border px-3.5 py-2.5 text-[14px] font-[inherit]"
        />

        <label className="mb-1.5 flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-[13.5px] font-medium text-navy">{t('account.publicToggle')}</span>
        </label>
        <div className="mb-4 text-[12px] leading-6 text-muted">{t('account.publicHint')}</div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void saveProfile()}
            disabled={profileBusy}
            className="rounded-md bg-navy px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
          >
            {t('account.save')}
          </button>
          {profileMessage && <span className="text-[13px] text-navy">{profileMessage}</span>}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-5 md:p-6">
        <div className="mb-4 text-[14px] font-semibold text-navy">{t('account.passwordSection')}</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('account.newPasswordPh')}
            className="flex-1 rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <button
            onClick={() => void savePassword()}
            disabled={passBusy}
            className="rounded-md bg-navy px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
          >
            {t('account.update')}
          </button>
        </div>
        {passMessage && <div className="mt-2 text-[13px] text-navy">{passMessage}</div>}
      </div>
    </div>
  )
}
