import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listMyStudents } from '@/lib/courses'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'

export function TeacherStudentsPage() {
  const { profile } = useAuth()
  const { t, lang } = useLanguage()
  const [q, setQ] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['my-students', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyStudents(profile!.id),
  })
  const shown = (data ?? []).filter((s) => !q.trim() || `${s.name} ${s.username} ${s.courseTitles.join(' ')}`.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="font-heading text-xl font-bold text-navy">
          {t('tStudents.title')} {data && data.length > 0 && <span className="text-[14px] font-normal text-muted">({data.length})</span>}
        </div>
        {data && data.length > 0 && (
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث بالاسم أو الدورة…' : 'Search by name or course…'}
            className="w-full max-w-xs rounded-lg border border-border bg-white px-3.5 py-2 text-[13px]"
          />
        )}
      </div>

      {isLoading && <LoadingState />}
      {data && data.length === 0 && <EmptyState title={t('tStudents.none')} />}

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {shown.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-white p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-[15px] font-bold text-gold">{s.name.trim().charAt(0)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[14px] font-semibold text-navy">{s.name}</span>
                <span className="shrink-0 text-[12px] text-faint">@{s.username}</span>
              </div>
              <div className="truncate text-[12.5px] text-muted">{s.courseTitles.join('، ')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
