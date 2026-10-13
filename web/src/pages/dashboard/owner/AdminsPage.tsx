import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createAdmin, listAdmins, removeAdmin } from '@/lib/owner'
import { supabase } from '@/lib/supabase'
import { fnErrorBody, isValidUsername } from '@/lib/authHelpers'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { LoadingState } from '@/components/LoadingState'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// create-admin answers with an error code; show it in the owner's language.
const ADMIN_ERRORS: Record<string, { ar: string; en: string }> = {
  invalid_email: { ar: 'البريد الإلكتروني غير صحيح — اكتب بريدًا كاملًا مثل name@example.com', en: 'Invalid email — enter a full address like name@example.com' },
  invalid_username: { ar: 'اسم المستخدم من 3 إلى 30 حرفًا بدون مسافات أو @', en: 'Username must be 3–30 characters, no spaces or @' },
  password_short: { ar: 'كلمة المرور 6 أحرف على الأقل', en: 'Password must be at least 6 characters' },
  username_taken: { ar: 'اسم المستخدم مستخدم بالفعل', en: 'That username is already taken' },
  email_in_use: { ar: 'هذا البريد مرتبط بحساب آخر في المنصة', en: 'This email already belongs to another account' },
  missing_fields: { ar: 'املأ جميع الحقول', en: 'Fill in all fields' },
}

async function adminErrorText(e: unknown, lang: string, fallback: string): Promise<string> {
  const code = (await fnErrorBody(e))?.error
  const known = typeof code === 'string' ? ADMIN_ERRORS[code] : undefined
  if (known) return lang === 'ar' ? known.ar : known.en
  return typeof code === 'string' ? code : fallback
}

async function removeAdminAccount(userId: string) {
  const { error } = await supabase.functions.invoke('create-admin', { body: { action: 'remove', userId } })
  if (!error) return
  // Older create-admin (not yet redeployed) has no 'remove' action.
  if ((await fnErrorBody(error))?.error === 'missing required fields') return removeAdmin(userId)
  throw error
}

function NewAdminModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t, lang } = useLanguage()
  const errText = (code: keyof typeof ADMIN_ERRORS) => (lang === 'ar' ? ADMIN_ERRORS[code].ar : ADMIN_ERRORS[code].en)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isTemp, setIsTemp] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!name.trim() || !username.trim() || !email.trim() || password.length < 6) {
      setError(t('oAdmins.fillFields'))
      return
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError(errText('invalid_email'))
      return
    }
    if (!isValidUsername(username.trim())) {
      setError(errText('invalid_username'))
      return
    }
    setBusy(true)
    setError('')
    try {
      await createAdmin({ name: name.trim(), username: username.trim(), email: email.trim(), password, isTemp })
      onCreated()
      onClose()
    } catch (e) {
      setError(await adminErrorText(e, lang, t('oAdmins.createError')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 font-heading text-lg font-bold text-navy">{t('oAdmins.newTitle')}</div>
        <div className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('oAdmins.namePh')}
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('oAdmins.usernamePh')}
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('oAdmins.emailPh')}
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('oAdmins.passwordPh')}
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <label className="flex items-center gap-2 text-[13.5px] text-navy">
            <input type="checkbox" checked={isTemp} onChange={(e) => setIsTemp(e.target.checked)} />
            {t('oAdmins.tempAccount')}
          </label>
          {error && <div className="text-[13px] text-error">{error}</div>}
          <div className="mt-1 flex gap-2.5">
            <button
              onClick={() => void submit()}
              disabled={busy}
              className="flex-1 rounded-md bg-navy py-2.75 text-[14px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
            >
              {t('oAdmins.create')}
            </button>
            <button onClick={onClose} className="rounded-md border border-border px-5 py-2.75 text-[14px] text-navy">
              {t('dash.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function OwnerAdminsPage() {
  const { t, lang } = useLanguage()
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const [showNew, setShowNew] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['admins'], queryFn: listAdmins })

  const canRemove = !profile?.is_temp_admin

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admins'] })

  const remove = async (id: string, name: string) => {
    if (!confirm(t('oAdmins.confirmRemove', { name }))) return
    try {
      await removeAdminAccount(id)
    } catch (e) {
      alert(await adminErrorText(e, lang, t('oAdmins.createError')))
    }
    refresh()
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="font-heading text-xl font-bold text-navy">{t('oAdmins.title')}</div>
        {canRemove && (
          <button
            onClick={() => setShowNew(true)}
            className="rounded-md bg-navy px-4.5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-navy-hover"
          >
            {t('oAdmins.newBtn')}
          </button>
        )}
      </div>

      {isLoading && <LoadingState />}

      <div className="flex flex-col gap-2.5">
        {(data ?? []).map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-4">
            <div className="flex items-center gap-2.5">
              <div>
                <div className="text-[14.5px] font-semibold text-navy">{a.name}</div>
                <div className="text-[12.5px] text-muted">@{a.username}</div>
              </div>
              {a.is_temp_admin && (
                <span className="rounded-full bg-bg-soft px-2.5 py-1 text-[11px] text-muted">{t('oAdmins.tempBadge')}</span>
              )}
            </div>
            {canRemove && a.id !== profile?.id && (
              <button
                onClick={() => void remove(a.id, a.name)}
                className="rounded-md border border-error px-3.5 py-1.5 text-[12.5px] text-error hover:bg-error-bg"
              >
                {t('oAdmins.remove')}
              </button>
            )}
          </div>
        ))}
      </div>

      {showNew && <NewAdminModal onClose={() => setShowNew(false)} onCreated={refresh} />}
    </div>
  )
}
