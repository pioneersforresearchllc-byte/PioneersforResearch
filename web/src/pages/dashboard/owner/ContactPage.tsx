import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listContactMessages, markContactMessageRead } from '@/lib/owner'

export function OwnerContactPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['contact-messages'], queryFn: listContactMessages })

  const markRead = async (id: string) => {
    await markContactMessageRead(id)
    void queryClient.invalidateQueries({ queryKey: ['contact-messages'] })
  }

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">رسائل التواصل</div>

      {isLoading && <div className="text-muted">جارِ التحميل...</div>}
      {data && data.length === 0 && <div className="text-muted">لا توجد رسائل بعد.</div>}

      <div className="flex flex-col gap-2.5">
        {(data ?? []).map((m) => (
          <div
            key={m.id}
            className={`rounded-lg border p-4 ${m.read ? 'border-border bg-white' : 'border-navy bg-bg-soft'}`}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-[14px] font-semibold text-navy">{m.name}</div>
              <span className="text-[12px] text-faint">{m.email}</span>
            </div>
            <p className="mb-2 text-[13.5px] leading-7 text-muted-2">{m.message}</p>
            {!m.read && (
              <button
                onClick={() => void markRead(m.id)}
                className="rounded-md border border-navy px-3.5 py-1.5 text-[12px] text-navy hover:bg-white"
              >
                تحديد كمقروءة
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
