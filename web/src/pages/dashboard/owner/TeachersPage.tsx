import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { dismissTeacher, listAllTeachers } from '@/lib/teachers'

const statusClass: Record<string, string> = {
  active: 'bg-success-bg text-success',
  rejected: 'bg-error-bg text-error',
}

export function OwnerTeachersPage() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['all-teachers'], queryFn: listAllTeachers })

  const statusLabel = (s: string) =>
    s === 'active' ? t('oTeachers.active') : s === 'rejected' ? t('oTeachers.rejected') : s

  const dismiss = async (id: string, name: string) => {
    if (!confirm(t('oTeachers.confirmRemove', { name }))) return
    await dismissTeacher(id)
    void queryClient.invalidateQueries({ queryKey: ['all-teachers'] })
  }

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('oTeachers.title')}</div>

      {isLoading && <div className="text-muted">{t('dash.loading')}</div>}
      {data && data.length === 0 && <div className="text-muted">{t('oTeachers.none')}</div>}

      <div className="flex flex-col gap-2.5">
        {(data ?? []).map((tc) => (
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
