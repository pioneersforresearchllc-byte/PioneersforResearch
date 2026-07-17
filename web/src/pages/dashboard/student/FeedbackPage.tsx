import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listMyGrades } from '@/lib/account'

export function StudentFeedbackPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const { data, isLoading } = useQuery({
    queryKey: ['my-grades', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyGrades(profile!.id),
  })

  const withFeedback = (data ?? []).filter((g) => g.feedback)

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('sFeedback.title')}</div>

      {isLoading && <div className="text-muted">{t('dash.loading')}</div>}
      {withFeedback.length === 0 && !isLoading && <div className="text-muted">{t('sFeedback.none')}</div>}

      <div className="flex flex-col gap-2.5">
        {withFeedback.map((g) => (
          <div key={g.id} className="rounded-lg border border-border bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[14px] font-semibold text-navy">{g.assignmentTitle}</span>
              <span className="text-[12.5px] text-faint">{g.courseTitle}</span>
            </div>
            <p className="text-[13.5px] leading-7 text-muted-2">{g.feedback}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
