import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { dismissTeacher, listAllTeachers } from '@/lib/teachers'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'

const statusClass: Record<string, string> = {
  active: 'bg-success-bg text-success',
  rejected: 'bg-error-bg text-error',
}

export function OwnerTeachersPage() {
  const { t, lang } = useLanguage()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['all-teachers'], queryFn: listAllTeachers })
  const [q, setQ] = useState('')
  const shown = (data ?? []).filter((tc) => !q.trim() || `${tc.name} ${tc.username} ${tc.specialty ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))

  const statusLabel = (s: string) =>
    s === 'active' ? t('oTeachers.active') : s === 'rejected' ? t('oTeachers.rejected') : s

  const dismiss = async (id: string, name: string) => {
    if (!confirm(t('oTeachers.confirmRemove', { name }))) return
    await dismissTeacher(id)
    void queryClient.invalidateQueries({ queryKey: ['all-teachers'] })
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="font-heading text-xl font-bold text-navy">{t('oTeachers.title')}</div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={lang === 'ar' ? 'بحث بالاسم أو التخصص…' : 'Search name or specialty…'}
          className="w-full max-w-xs rounded-lg border border-border bg-white px-3.5 py-2 text-[13px]"
        />
      </div>

      {isLoading && <LoadingState />}
      {data && data.length === 0 && <EmptyState title={t('oTeachers.none')} />}

      <div className="flex flex-col gap-2.5">
        {shown.map((tc) => (
          <div key={tc.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-4">
            <div>
              <div className="text-[14.5px] font-semibold text-navy">{tc.name}</div>
              <div className="text-[12.5px] text-muted">
                @{tc.username} {tc.specialty ? `· ${tc.specialty}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${statusClass[tc.status] ?? ''}`}>
                {statusLabel(tc.status)}
              </span>
              {tc.status === 'active' && (
                <button
                  onClick={() => void dismiss(tc.id, tc.name)}
                  className="rounded-md border border-error px-3.5 py-1.5 text-[12.5px] text-error hover:bg-error-bg"
                >
                  {t('oTeachers.remove')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
