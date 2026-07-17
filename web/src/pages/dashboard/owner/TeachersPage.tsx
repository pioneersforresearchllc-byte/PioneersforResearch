import { useQuery, useQueryClient } from '@tanstack/react-query'
import { dismissTeacher, listAllTeachers } from '@/lib/teachers'

const statusLabel: Record<string, string> = { active: 'نشط', rejected: 'مرفوض' }
const statusClass: Record<string, string> = {
  active: 'bg-success-bg text-success',
  rejected: 'bg-error-bg text-error',
}

export function OwnerTeachersPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['all-teachers'], queryFn: listAllTeachers })

  const dismiss = async (id: string, name: string) => {
    if (!confirm(`إقالة ${name}؟ سيفقد صلاحية الدخول ويُزال من كل الدورات المكلّف فيها.`)) return
    await dismissTeacher(id)
    void queryClient.invalidateQueries({ queryKey: ['all-teachers'] })
  }

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">المعلمون</div>

      {isLoading && <div className="text-muted">جارِ التحميل...</div>}
      {data && data.length === 0 && <div className="text-muted">لا يوجد معلمون بعد.</div>}

      <div className="flex flex-col gap-2.5">
        {(data ?? []).map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-4">
            <div>
              <div className="text-[14.5px] font-semibold text-navy">{t.name}</div>
              <div className="text-[12.5px] text-muted">
                @{t.username} {t.specialty ? `· ${t.specialty}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${statusClass[t.status] ?? ''}`}>
                {statusLabel[t.status] ?? t.status}
              </span>
              {t.status === 'active' && (
                <button
                  onClick={() => void dismiss(t.id, t.name)}
                  className="rounded-md border border-error px-3.5 py-1.5 text-[12.5px] text-error hover:bg-error-bg"
                >
                  إقالة
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
