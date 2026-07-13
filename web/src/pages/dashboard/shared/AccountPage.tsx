import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { changePassword, updateAvatarUrl, updateProfileName, uploadAvatar } from '@/lib/account'

export function AccountPage() {
  const { profile, refreshProfile } = useAuth()
  const [name, setName] = useState(profile?.name ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [nameBusy, setNameBusy] = useState(false)
  const [passBusy, setPassBusy] = useState(false)
  const [nameMessage, setNameMessage] = useState('')
  const [passMessage, setPassMessage] = useState('')

  if (!profile) return null

  const saveName = async () => {
    if (!name.trim()) return
    setNameBusy(true)
    setNameMessage('')
    try {
      await updateProfileName(profile.id, name.trim())
      await refreshProfile()
      setNameMessage('تم الحفظ.')
    } catch (e) {
      setNameMessage(e instanceof Error ? e.message : 'تعذر الحفظ')
    } finally {
      setNameBusy(false)
    }
  }

  const handleAvatar = async (file: File) => {
    setNameBusy(true)
    try {
      const url = await uploadAvatar(profile.id, file)
      await updateAvatarUrl(profile.id, url)
      await refreshProfile()
    } finally {
      setNameBusy(false)
    }
  }

  const savePassword = async () => {
    if (newPassword.length < 6) {
      setPassMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    setPassBusy(true)
    setPassMessage('')
    try {
      await changePassword(newPassword)
      setNewPassword('')
      setPassMessage('تم تغيير كلمة المرور.')
    } catch (e) {
      setPassMessage(e instanceof Error ? e.message : 'تعذر تغيير كلمة المرور')
    } finally {
      setPassBusy(false)
    }
  }

  return (
    <div className="max-w-120">
      <div className="mb-5 font-heading text-xl font-bold text-navy">حسابي</div>

      <div className="mb-6 rounded-xl border border-border bg-white p-5">
        <div className="mb-3 text-[14px] font-semibold text-navy">الملف الشخصي</div>
        <div className="mb-3 flex items-center gap-3">
          {profile.avatar_url && <img src={profile.avatar_url} className="h-14 w-14 rounded-full object-cover" alt="" />}
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void handleAvatar(e.target.files[0])} />
        </div>
        <div className="mb-2 text-[12.5px] text-muted">@{profile.username}</div>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <button
            onClick={() => void saveName()}
            disabled={nameBusy}
            className="rounded-md bg-navy px-4.5 py-2.5 text-[13px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
          >
            حفظ
          </button>
        </div>
        {nameMessage && <div className="mt-2 text-[13px] text-navy">{nameMessage}</div>}
      </div>

      <div className="rounded-xl border border-border bg-white p-5">
        <div className="mb-3 text-[14px] font-semibold text-navy">كلمة المرور</div>
        <div className="flex gap-2">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="كلمة مرور جديدة"
            className="flex-1 rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <button
            onClick={() => void savePassword()}
            disabled={passBusy}
            className="rounded-md bg-navy px-4.5 py-2.5 text-[13px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
          >
            تحديث
          </button>
        </div>
        {passMessage && <div className="mt-2 text-[13px] text-navy">{passMessage}</div>}
      </div>
    </div>
  )
}
