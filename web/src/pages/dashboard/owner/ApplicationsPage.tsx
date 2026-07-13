import { useQuery, useQueryClient } from '@tanstack/react-query'
import { approveTeacher, listPendingTeachers, rejectTeacher } from '@/lib/teachers'

export function OwnerApplicationsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['pending-teachers'], queryFn: listPendingTeachers })

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['pending-teachers'] })

  const approve = async (id: string) => {
    await approveTeacher(id)
    refresh()
  }
  const reject = async (id: string) => {
    if (!confirm('رفض هذا الطلب؟')) return
    await rejectTeacher(id)
    refresh()
  }

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">طلبات المعلمين</div>

      {isLoading && <div className="text-muted">جارِ التحميل...</div>}
      {data && data.length === 0 && <div className="text-muted">لا توجد طلبات معلّقة.</div>}

      <div className="flex flex-col gap-4">
        {(data ?? []).map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-white p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[15.5px] font-semibold text-navy">{t.name}</div>
              <span className="text-[12px] text-faint">@{t.username}</span>
            </div>
            <div className="mb-1.5 flex gap-4 text-[13px] text-muted">
              {t.specialty && <span>التخصص: {t.specialty}</span>}
              {t.qualification && <span>المؤهل: {t.qualification}</span>}
              {t.years_experience != null && <span>الخبرة: {t.years_experience} سنة</span>}
            </div>
            {t.cv_text && (
              <div className="mb-3 whitespace-pre-wrap rounded-md bg-bg-soft p-3 text-[13px] leading-7 text-muted-2">
                {t.cv_text}
              </div>
            )}
            <div className="flex gap-2.5">
              <button
                onClick={() => void approve(t.id)}
                className="rounded-md bg-success px-4.5 py-2 text-[13px] font-semibold text-white hover:opacity-90"
              >
                قبول
              </button>
              <button
                onClick={() => void reject(t.id)}
                className="rounded-md border border-error px-4.5 py-2 text-[13px] text-error hover:bg-error-bg"
              >
                رفض
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
