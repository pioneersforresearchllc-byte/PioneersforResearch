import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import {
  adminSetPassword,
  deleteUserAccount,
  enrollStudent,
  listAllAccounts,
  RESTRICTION_CAPS,
  setUserRestrictions,
  setUserSuspended,
  unenrollStudent,
  type AccountRow,
} from '@/lib/owner'
import { listCoursesWithMeta } from '@/lib/courses'
import { supabase } from '@/lib/supabase'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'

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

function ManageUserModal({ account, onClose, onChanged }: { account: AccountRow; onClose: () => void; onChanged: () => void }) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [suspended, setSuspended] = useState(account.suspended)
  const [restrictions, setRestrictions] = useState<string[]>(account.restrictions ?? [])
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [courseToAdd, setCourseToAdd] = useState('')

  const isStudent = account.role === 'student'

  const courses = useQuery({ queryKey: ['owner-courses-min'], queryFn: listCoursesWithMeta })
  const enrollments = useQuery({
    queryKey: ['user-enrollments', account.id],
    enabled: isStudent,
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('course_id, course:courses(title)')
        .eq('student_id', account.id)
      return (data ?? []).map((r) => ({
        course_id: r.course_id as string,
        title: (r.course as unknown as { title: string } | null)?.title ?? '',
      }))
    },
  })

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setMsg('')
    try {
      await fn()
      setMsg(t('adminAccounts.actionSaved'))
      onChanged()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t('adminAccounts.actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  const toggleSuspend = () =>
    run(async () => {
      const next = !suspended
      await setUserSuspended(account.id, next)
      setSuspended(next)
    })

  const toggleRestriction = (cap: string) =>
    run(async () => {
      const next = restrictions.includes(cap) ? restrictions.filter((r) => r !== cap) : [...restrictions, cap]
      await setUserRestrictions(account.id, next)
      setRestrictions(next)
    })

  const refreshEnroll = () => void queryClient.invalidateQueries({ queryKey: ['user-enrollments', account.id] })

  const doEnroll = () => {
    if (!courseToAdd) return
    void run(async () => {
      await enrollStudent(account.id, courseToAdd)
      setCourseToAdd('')
      refreshEnroll()
    })
  }

  const doUnenroll = (courseId: string) =>
    run(async () => {
      await unenrollStudent(account.id, courseId)
      refreshEnroll()
    })

  const setPass = () =>
    run(async () => {
      await adminSetPassword(account.id, password)
      setPassword('')
    })

  const doDelete = () => {
    if (!confirm(t('adminAccounts.deleteConfirm'))) return
    void run(async () => {
      await deleteUserAccount(account.id)
      onClose()
    })
  }

  const availableCourses = (courses.data ?? []).filter(
    (c) => !(enrollments.data ?? []).some((e) => e.course_id === c.id),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-[540px] flex-col gap-5 overflow-y-auto rounded-2xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="font-heading text-lg font-bold text-navy">{t('adminAccounts.manageTitle')}</div>
          <div className="text-[13px] text-muted">
            {account.name} · @{account.username}
          </div>
        </div>

        {/* Suspend */}
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border p-3.5">
          <span className="text-[13.5px] font-medium text-navy">{t('adminAccounts.suspend')}</span>
          <input type="checkbox" checked={suspended} onChange={toggleSuspend} disabled={busy} className="h-4.5 w-4.5" />
        </label>

        {/* Restrictions */}
        <div className="rounded-xl border border-border p-3.5">
          <div className="mb-2.5 text-[13.5px] font-semibold text-navy">{t('adminAccounts.restrictionsTitle')}</div>
          <div className="grid grid-cols-2 gap-2">
            {RESTRICTION_CAPS.map((cap) => (
              <label key={cap} className="flex cursor-pointer items-center gap-2 text-[13px] text-navy">
                <input
                  type="checkbox"
                  checked={restrictions.includes(cap)}
                  onChange={() => toggleRestriction(cap)}
                  disabled={busy}
                  className="h-4 w-4"
                />
                {t(`restriction.${cap}` as 'restriction.chat')}
              </label>
            ))}
          </div>
        </div>

        {/* Enrollment (students only) */}
        {isStudent && (
          <div className="rounded-xl border border-border p-3.5">
            <div className="mb-2.5 text-[13.5px] font-semibold text-navy">{t('adminAccounts.enrollTitle')}</div>
            {enrollments.isLoading ? (
              <LoadingState />
            ) : (enrollments.data ?? []).length === 0 ? (
              <div className="mb-2.5 text-[12.5px] text-muted">{t('adminAccounts.notEnrolled')}</div>
            ) : (
              <div className="mb-2.5 flex flex-col gap-1.5">
                {(enrollments.data ?? []).map((e) => (
                  <div key={e.course_id} className="flex items-center justify-between rounded-lg bg-bg-soft px-3 py-2">
                    <span className="text-[13px] text-navy">{e.title}</span>
                    <button
                      onClick={() => doUnenroll(e.course_id)}
                      disabled={busy}
                      className="text-[12px] font-semibold text-error hover:underline disabled:opacity-50"
                    >
                      {t('adminAccounts.unenroll')}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <select
                value={courseToAdd}
                onChange={(e) => setCourseToAdd(e.target.value)}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-[13px]"
              >
                <option value="">{t('adminAccounts.selectCourse')}</option>
                {availableCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <button
                onClick={doEnroll}
                disabled={busy || !courseToAdd}
                className="rounded-lg bg-navy px-4 py-2 text-[13px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
              >
                {t('adminAccounts.enrollBtn')}
              </button>
            </div>
          </div>
        )}

        {/* Password reset */}
        <div className="rounded-xl border border-border p-3.5">
          <div className="mb-2.5 text-[13.5px] font-semibold text-navy">{t('adminAccounts.passwordTitle')}</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('adminAccounts.newPasswordPh')}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-[13px]"
            />
            <button
              onClick={setPass}
              disabled={busy || password.length < 6}
              className="rounded-lg bg-navy px-4 py-2 text-[13px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
            >
              {t('adminAccounts.setPassword')}
            </button>
          </div>
        </div>

        {/* Delete */}
        <div className="rounded-xl border border-error/30 bg-error/[0.04] p-3.5">
          <div className="mb-1 text-[13.5px] font-semibold text-error">{t('adminAccounts.deleteTitle')}</div>
          <div className="mb-2.5 text-[12px] text-muted">{t('adminAccounts.deleteWarn')}</div>
          <button
            onClick={doDelete}
            disabled={busy}
            className="rounded-lg bg-error px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {t('adminAccounts.deleteBtn')}
          </button>
        </div>

        {msg && <div className="text-[13px] text-navy">{msg}</div>}
        <button onClick={onClose} className="rounded-lg border border-border py-2.5 text-[13px] font-semibold text-navy">
          {t('dash.close')}
        </button>
      </div>
    </div>
  )
}

type RoleFilter = 'all' | 'student' | 'teacher' | 'admin'

export function OwnerAccountsPage() {
  const { t, lang } = useLanguage()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [managing, setManaging] = useState<AccountRow | null>(null)
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin-accounts'], queryFn: listAllAccounts })
  const queryClient = useQueryClient()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data ?? []).filter((a) => {
      const matchesRole =
        roleFilter === 'all' || (roleFilter === 'admin' ? a.role === 'owner' : a.role === roleFilter)
      const matchesSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.username.toLowerCase().includes(q) ||
        (a.email ?? '').toLowerCase().includes(q)
      return matchesRole && matchesSearch
    })
  }, [data, search, roleFilter])

  const filters: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: t('adminAccounts.filterAll') },
    { key: 'student', label: t('adminAccounts.filterStudents') },
    { key: 'teacher', label: t('adminAccounts.filterTeachers') },
    { key: 'admin', label: t('adminAccounts.filterAdmins') },
  ]

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
        className="mb-3 w-full max-w-100 rounded-md border border-border px-3.5 py-2.5 text-[14px]"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setRoleFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
              roleFilter === f.key ? 'bg-navy text-white' : 'border border-border text-navy hover:border-navy'
            }`}
          >
            {f.label}
          </button>
        ))}
        {!isLoading && !isError && (
          <span className="text-[12.5px] text-muted">{t('adminAccounts.countLabel', { n: String(filtered.length) })}</span>
        )}
      </div>

      {isLoading && <LoadingState />}
      {isError && <div className="text-error">{t('adminAccounts.loadFailed')}</div>}
      {!isLoading && !isError && filtered.length === 0 && <EmptyState title={t('adminAccounts.loadFailed')} />}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full min-w-[760px] text-right text-[13.5px]">
            <thead>
              <tr className="border-b border-border text-[12.5px] text-muted">
                <th className="p-3 font-semibold">{t('adminAccounts.colName')}</th>
                <th className="p-3 font-semibold">{t('adminAccounts.colRole')}</th>
                <th className="p-3 font-semibold">{t('adminAccounts.colEmail')}</th>
                <th className="p-3 font-semibold">{t('adminAccounts.colRegistered')}</th>
                <th className="p-3 font-semibold">{t('adminAccounts.colLastActive')}</th>
                <th className="p-3 font-semibold">{t('adminAccounts.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-border-2 last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-navy">{a.name}</span>
                      {a.suspended && (
                        <span className="rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-bold text-error">
                          {t('adminAccounts.suspendedBadge')}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-muted">@{a.username}</div>
                  </td>
                  <td className="p-3">
                    <span className="rounded-full bg-bg-soft px-2.5 py-1 text-[12px] font-semibold text-navy">
                      {roleLabel(a.role)}
                    </span>
                  </td>
                  <td className="p-3 text-muted">{a.email ?? '—'}</td>
                  <td className="p-3 text-muted">{formatDate(a.created_at, lang, '—')}</td>
                  <td className="p-3 text-muted">{formatDate(a.last_sign_in_at, lang, t('adminAccounts.never'))}</td>
                  <td className="p-3">
                    <button
                      onClick={() => setManaging(a)}
                      className="rounded-lg border border-navy px-3.5 py-1.5 text-[12.5px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
                    >
                      {t('adminAccounts.manage')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {managing && (
        <ManageUserModal
          account={managing}
          onClose={() => setManaging(null)}
          onChanged={() => void queryClient.invalidateQueries({ queryKey: ['admin-accounts'] })}
        />
      )}
    </div>
  )
}
