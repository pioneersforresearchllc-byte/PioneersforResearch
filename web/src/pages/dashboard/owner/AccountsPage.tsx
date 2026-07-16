import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { adminSetPassword, listAllAccounts, type AccountRow } from '@/lib/owner'

function formatDate(iso: string | null, lang: string, never: string) {
  if (!iso) return never
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PasswordControl({ account }: { account: AccountRow }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async () => {
    setBusy(true)
    setMessage('')
    try {
      await adminSetPassword(account.id, password)
      setPassword('')
      setMessage(t('adminAccounts.passwordSet'))
    } catch {
      setMessage(t('adminAccounts.passwordFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[12.5px] font-semibold text-navy hover:underline">
        {t('adminAccounts.changePassword')}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('adminAccounts.newPasswordPh')}
          className="w-52 rounded-md border border-border px-2.5 py-1.5 text-[12.5px]"
        />
        <button
          onClick={() => void submit()}
          disabled={busy || password.length < 6}
          className="rounded-md bg-navy px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {t('adminAccounts.setPassword')}
        </button>
        <button onClick={() => setOpen(false)} className="px-2 text-[12px] text-muted">
          ✕
        </button>
      </div>
      {message && <div className="text-[12px] text-navy">{message}</div>}
    </div>
  )
}

export function OwnerAccountsPage() {
  const { t, lang } = useLanguage()
  const [search, setSearch] = useState('')
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin-accounts'], queryFn: listAllAccounts })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data ?? []
    return (data ?? []).filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.username.toLowerCase().includes(q) ||
        (a.email ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  const roleLabel = (role: string) =>
    role === 'teacher' ? t('role.teacher') : role === 'owner' ? t('role.owner') : t('role.student')

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('adminAccounts.title')}</div>
      <div className="mb-4 text-[13.5px] text-muted">{t('adminAccounts.subtitle')}</div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('adminAccounts.searchPh')}
        className="mb-4 w-full max-w-100 rounded-md border border-border px-3.5 py-2.5 text-[14px]"
      />

      {isLoading && <div className="text-muted">{t('adminAccounts.loading')}</div>}
      {isError && <div className="text-error">{t('adminAccounts.loadFailed')}</div>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full min-w-[640px] text-right text-[13.5px]">
            <thead>
              <tr className="border-b border-border text-[12.5px] text-muted">
                <th className="p-3 font-semibold">{t('adminAccounts.colName')}</th>
                <th className="p-3 font-semibold">{t('adminAccounts.colRole')}</th>
                <th className="p-3 font-semibold">{t('adminAccounts.colEmail')}</th>
                <th className="p-3 font-semibold">{t('adminAccounts.colLastActive')}</th>
                <th className="p-3 font-semibold">{t('adminAccounts.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-border-2 last:border-0">
                  <td className="p-3">
                    <div className="font-semibold text-navy">{a.name}</div>
                    <div className="text-[12px] text-muted">@{a.username}</div>
                  </td>
                  <td className="p-3">
                    <span className="rounded-full bg-bg-soft px-2.5 py-1 text-[12px] font-semibold text-navy">
                      {roleLabel(a.role)}
                    </span>
                  </td>
                  <td className="p-3 text-muted">{a.email ?? '—'}</td>
                  <td className="p-3 text-muted">{formatDate(a.last_sign_in_at, lang, t('adminAccounts.never'))}</td>
                  <td className="p-3">
                    <PasswordControl account={a} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
