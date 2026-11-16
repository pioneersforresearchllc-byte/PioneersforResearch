import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createAdmin, listAdmins, removeAdmin } from '@/lib/owner'
import { supabase } from '@/lib/supabase'
import { fnErrorBody, isValidUsername } from '@/lib/authHelpers'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { LoadingState } from '@/components/LoadingState'
import { DEMO_COURSE_ID } from '@/lib/cpdDemo'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// create-admin answers with an error code; show it in the owner's language.
const ADMIN_ERRORS: Record<string, { ar: string; en: string }> = {
  invalid_email: { ar: 'البريد الإلكتروني غير صحيح — اكتب بريدًا كاملًا مثل name@example.com', en: 'Invalid email — enter a full address like name@example.com' },
  invalid_username: { ar: 'اسم المستخدم من 3 إلى 30 حرفًا بدون مسافات أو @', en: 'Username must be 3–30 characters, no spaces or @' },
  password_short: { ar: 'كلمة المرور 6 أحرف على الأقل', en: 'Password must be at least 6 characters' },
  username_taken: { ar: 'اسم المستخدم مستخدم بالفعل', en: 'That username is already taken' },
  email_in_use: { ar: 'هذا البريد مرتبط بحساب آخر في المنصة', en: 'This email already belongs to another account' },
  missing_fields: { ar: 'املأ جميع الحقول', en: 'Fill in all fields' },
  invalid_role: { ar: 'دور غير صالح', en: 'Invalid role' },
  migration_0093_missing: {
    ar: 'شغّل ملف قاعدة البيانات 0093_scfhs_review_access.sql أولًا، ثم أعد المحاولة.',
    en: 'Run database migration 0093_scfhs_review_access.sql first, then try again.',
  },
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

// One-click, pre-confirmed demo/review accounts for SCFHS — one per role the
// reviewer asked for: Admin, coordinator, lecturer, learner. A throwaway email;
// the generated credentials are shown once so the owner can record them.
// Admin/coordinator are temporary admins that sign in WITHOUT the emailed code
// until they expire (REVIEW_DAYS) — the reviewer cannot receive our email.
type DemoRole = 'admin' | 'coordinator' | 'teacher' | 'student'
interface DemoCred { role: DemoRole; name: string; username: string; email: string; password: string }
const REVIEW_DAYS = 60

function randomSuffix(): string {
  const a = new Uint8Array(3)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 4)
}
function randomPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const a = new Uint8Array(12)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => chars[b % chars.length]).join('')
}

function DemoAccounts() {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const tx = (a: string, e: string) => (ar ? a : e)
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState<DemoRole | null>(null)
  const [created, setCreated] = useState<DemoCred[]>([])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  const roleLabel: Record<DemoRole, string> = {
    admin: tx('مسؤول المنصة (Admin)', 'Platform admin'),
    coordinator: tx('منسق الأنشطة', 'Activities coordinator'),
    teacher: tx('محاضر', 'Lecturer'),
    student: tx('متعلّم', 'Learner'),
  }

  const make = async (role: DemoRole) => {
    setBusy(role)
    setError('')
    const suffix = randomSuffix()
    const username = `cpd_${role}_${suffix}`
    const cred: DemoCred = {
      role,
      name: `${roleLabel[role]} — ${tx('حساب مراجعة الهيئة', 'SCFHS review account')}`,
      username,
      email: `${username}@demo.pioneersresearch.com`,
      password: randomPassword(),
    }
    const isAdminRole = role === 'admin' || role === 'coordinator'
    try {
      const res = (await createAdmin({
        name: cred.name,
        username: cred.username,
        email: cred.email,
        password: cred.password,
        isTemp: isAdminRole,
        role: isAdminRole ? 'owner' : role,
        ...(isAdminRole ? { reviewDays: REVIEW_DAYS } : {}),
      })) as { profile?: { id?: string } } | null
      // A demo lecturer is assigned to the demo CPD activity so the reviewer
      // sees a populated lecturer space (no-op if the demo isn't seeded).
      const newId = res?.profile?.id
      if (role === 'teacher' && newId) {
        await supabase.from('course_teachers').insert({ course_id: DEMO_COURSE_ID, teacher_id: newId })
      }
      setCreated((c) => [cred, ...c])
      if (isAdminRole) void queryClient.invalidateQueries({ queryKey: ['admins'] })
    } catch (e) {
      setError(await adminErrorText(e, lang, tx('تعذّر إنشاء الحساب', 'Could not create the account')))
    } finally {
      setBusy(null)
    }
  }

  const copy = async (c: DemoCred) => {
    const text = `${tx('اسم المستخدم', 'Username')}: ${c.username}\n${tx('كلمة المرور', 'Password')}: ${c.password}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(c.username)
      setTimeout(() => setCopied(''), 2000)
    } catch {
      // clipboard blocked — the fields are visible to copy manually
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-gold/40 bg-gold/5 p-4">
      <div className="text-[14.5px] font-bold text-navy">{tx('حسابات تجريبية للمراجعة (الهيئة)', 'Demo accounts for review (SCFHS)')}</div>
      <p className="mt-1 mb-3 text-[12.5px] leading-6 text-muted">
        {tx(
          `حساب مؤكَّد بنقرة واحدة لكل دور تطلبه الهيئة. جميعها تدخل من صفحة الدخول نفسها (/login) باسم المستخدم وكلمة المرور. حسابا المسؤول والمنسق مؤقتان ويدخلان دون رمز تحقق لمدة ${REVIEW_DAYS} يومًا ثم يتوقفان تلقائيًا، ولا يستطيعان إضافة أو حذف مسؤولين. تظهر كلمة المرور مرة واحدة فقط — انسخها واحفظها، واحذف الحسابات بعد صدور الاعتماد.`,
          `A pre-confirmed account per role SCFHS asked for. All sign in on the same page (/login) with username and password. The admin and coordinator are temporary, sign in without the emailed code for ${REVIEW_DAYS} days and then stop, and cannot add or remove admins. The password is shown once — copy it, and delete these accounts after accreditation.`,
        )}
      </p>
      <div className="flex flex-wrap gap-2.5">
        {(['admin', 'coordinator', 'teacher', 'student'] as DemoRole[]).map((r) => (
          <button
            key={r}
            onClick={() => void make(r)}
            disabled={busy !== null}
            className="rounded-md bg-navy px-4 py-2 text-[13px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
          >
            {busy === r ? '…' : `+ ${roleLabel[r]}`}
          </button>
        ))}
      </div>
      {error && <div className="mt-2 text-[12.5px] text-error">{error}</div>}
      {created.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {created.map((c) => (
            <div key={c.username} className="rounded-lg border border-border bg-white p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-accent">
                  {roleLabel[c.role]} — {tx('تم الإنشاء ✔', 'Created ✔')}
                </span>
                <button onClick={() => void copy(c)} className="rounded border border-border px-2.5 py-1 text-[11.5px] text-navy hover:border-navy">
                  {copied === c.username ? tx('نُسخ', 'Copied') : tx('نسخ', 'Copy')}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-0.5 text-[12.5px] text-navy sm:grid-cols-2" dir="ltr">
                <div><span className="text-muted">{tx('اسم المستخدم', 'Username')}:</span> <b>{c.username}</b></div>
                <div><span className="text-muted">{tx('كلمة المرور', 'Password')}:</span> <b>{c.password}</b></div>
              </div>
            </div>
          ))}
          <div className="text-[11.5px] text-muted">
            {tx('البريد المستخدم وهمي ولا يُرسَل إليه شيء. الدخول باسم المستخدم وكلمة المرور.', 'The email is a throwaway and receives nothing. Sign in with the username and password.')}
          </div>
        </div>
      )}
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

      {canRemove && <DemoAccounts />}

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
              {a.otp_exempt_until && (
                <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[11px] text-navy">
                  {new Date(a.otp_exempt_until).getTime() > Date.now()
                    ? `${lang === 'ar' ? 'مراجعة الهيئة — بدون رمز حتى' : 'SCFHS review — no code until'} ${new Date(a.otp_exempt_until).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB')}`
                    : lang === 'ar' ? 'مراجعة الهيئة — منتهٍ' : 'SCFHS review — expired'}
                </span>
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
