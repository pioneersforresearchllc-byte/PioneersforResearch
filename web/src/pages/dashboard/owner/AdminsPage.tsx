import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createAdmin, listAdmins, removeAdmin } from '@/lib/owner'
import { useAuth } from '@/context/AuthContext'

function NewAdminModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isTemp, setIsTemp] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!name.trim() || !username.trim() || !email.trim() || password.length < 6) {
      setError('عبّئ كل الحقول (كلمة المرور 6 أحرف على الأقل)')
      return
    }
    setBusy(true)
    setError('')
    try {
      await createAdmin({ name: name.trim(), username: username.trim(), email: email.trim(), password, isTemp })
      onCreated()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إنشاء الحساب')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-[420px] rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 font-heading text-lg font-bold text-navy">عضو إدارة جديد</div>
        <div className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم الكامل"
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="اسم المستخدم"
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني"
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <label className="flex items-center gap-2 text-[13.5px] text-navy">
            <input type="checkbox" checked={isTemp} onChange={(e) => setIsTemp(e.target.checked)} />
            حساب مؤقت (لا يقدر يزيل أعضاء إدارة آخرين)
          </label>
          {error && <div className="text-[13px] text-error">{error}</div>}
          <div className="mt-1 flex gap-2.5">
            <button
              onClick={() => void submit()}
              disabled={busy}
              className="flex-1 rounded-md bg-navy py-2.75 text-[14px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
            >
              إنشاء الحساب
            </button>
            <button onClick={onClose} className="rounded-md border border-border px-5 py-2.75 text-[14px] text-navy">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function OwnerAdminsPage() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const [showNew, setShowNew] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['admins'], queryFn: listAdmins })

  const canRemove = !profile?.is_temp_admin

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admins'] })

  const remove = async (id: string, name: string) => {
    if (!confirm(`إزالة صلاحية الإدارة عن ${name}؟`)) return
    await removeAdmin(id)
    refresh()
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="font-heading text-xl font-bold text-navy">أعضاء الإدارة</div>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-md bg-navy px-4.5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-navy-hover"
        >
          + عضو جديد
        </button>
      </div>

      {isLoading && <div className="text-muted">جارِ التحميل...</div>}

      <div className="flex flex-col gap-2.5">
        {(data ?? []).map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-4">
            <div className="flex items-center gap-2.5">
              <div>
                <div className="text-[14.5px] font-semibold text-navy">{a.name}</div>
                <div className="text-[12.5px] text-muted">@{a.username}</div>
              </div>
              {a.is_temp_admin && (
                <span className="rounded-full bg-bg-soft px-2.5 py-1 text-[11px] text-muted">مؤقت</span>
              )}
            </div>
            {canRemove && a.id !== profile?.id && (
              <button
                onClick={() => void remove(a.id, a.name)}
                className="rounded-md border border-error px-3.5 py-1.5 text-[12.5px] text-error hover:bg-error-bg"
              >
                إزالة
              </button>
            )}
          </div>
        ))}
      </div>

      {showNew && <NewAdminModal onClose={() => setShowNew(false)} onCreated={refresh} />}
    </div>
  )
}
