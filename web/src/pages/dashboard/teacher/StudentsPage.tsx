import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listMyStudents } from '@/lib/courses'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'

export function TeacherStudentsPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const { data, isLoading } = useQuery({
    queryKey: ['my-students', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyStudents(profile!.id),
  })

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('tStudents.title')}</div>

      {isLoading && <LoadingState />}
      {data && data.length === 0 && <EmptyState title={t('tStudents.none')} />}

      <div className="flex flex-col gap-2.5">
        {(data ?? []).map((s) => (
          <div key={s.id} className="rounded-lg border border-border bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[14px] font-semibold text-navy">{s.name}</span>
              <span className="text-[12px] text-faint">@{s.username}</span>
            </div>
            <div className="text-[12.5px] text-muted">{s.courseTitles.join('، ')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
