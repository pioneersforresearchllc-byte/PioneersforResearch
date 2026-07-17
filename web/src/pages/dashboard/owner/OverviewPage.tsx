import { useQuery } from '@tanstack/react-query'
import { getOverviewStats } from '@/lib/owner'

function formatSar(cents: number) {
  return `${(cents / 100).toLocaleString('ar-SA')} ريال`
}

export function OwnerOverviewPage() {
  const { data, isLoading } = useQuery({ queryKey: ['owner-overview-stats'], queryFn: getOverviewStats })

  const cards = data
    ? [
        { label: 'طلبات معلمين معلّقة', value: data.pending_teacher_count },
        { label: 'معلمون نشطون', value: data.approved_teacher_count },
        { label: 'الدورات', value: data.courses_count },
        { label: 'الطلاب', value: data.students_count },
        { label: 'الإيرادات', value: formatSar(data.total_revenue_cents) },
        { label: 'عدد مرات تسجيل الدخول', value: data.login_count },
        { label: 'متوسط التقييم', value: data.overall_avg_rating.toFixed(1) },
      ]
    : []

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">نظرة عامة</div>
      {isLoading && <div className="text-muted">جارِ التحميل...</div>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-white p-5 text-center">
            <div className="font-heading text-[26px] font-bold text-navy">{c.value}</div>
            <div className="mt-1.5 text-[12.5px] text-muted">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
