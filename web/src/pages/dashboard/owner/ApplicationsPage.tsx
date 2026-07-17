import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { approveTeacher, listPendingTeachers, rejectTeacher, signCvFile } from '@/lib/teachers'

export function OwnerApplicationsPage() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['pending-teachers'], queryFn: listPendingTeachers })

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['pending-teachers'] })

  const approve = async (id: string) => {
    await approveTeacher(id)
    refresh()
  }
  const reject = async (id: string) => {
    if (!confirm(t('oApps.confirmReject'))) return
    await rejectTeacher(id)
    refresh()
  }
  const openCv = async (path: string) => {
    const url = await signCvFile(path)
    if (url) window.open(url, '_blank')
  }

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('oApps.title')}</div>

      {isLoading && <div className="text-muted">{t('dash.loading')}</div>}
      {data && data.length === 0 && <div className="text-muted">{t('oApps.none')}</div>}

      <div className="flex flex-col gap-4">
        {(data ?? []).map((app) => (
          <div key={app.id} className="rounded-xl border border-border bg-white p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[15.5px] font-semibold text-navy">{app.name}</div>
              <span className="text-[12px] text-faint">@{app.username}</span>
            </div>
            <div className="mb-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
              {app.specialty && <span>{t('oApps.specialtyLabel', { v: app.specialty })}</span>}
              {app.qualification && <span>{t('oApps.qualificationLabel', { v: app.qualification })}</span>}
              {app.years_experience != null && <span>{t('oApps.experienceLabel', { n: String(app.years_experience) })}</span>}
            </div>
            {app.cv_text && (
              <div className="mb-3 whitespace-pre-wrap rounded-md bg-bg-soft p-3 text-[13px] leading-7 text-muted-2">
                {app.cv_text}
              </div>
            )}
            {app.cv_file_url && (
              <button
                onClick={() => void openCv(app.cv_file_url!)}
                className="mb-3 inline-block text-[12.5px] font-semibold text-navy underline"
              >
                {t('oApps.downloadCv')}
              </button>
            )}
            <div className="flex gap-2.5">
              <button
                onClick={() => void approve(app.id)}
                className="rounded-md bg-success px-4.5 py-2 text-[13px] font-semibold text-white hover:opacity-90"
              >
                {t('oApps.accept')}
              </button>
              <button
                onClick={() => void reject(app.id)}
                className="rounded-md border border-error px-4.5 py-2 text-[13px] text-error hover:bg-error-bg"
              >
                {t('oApps.reject')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
