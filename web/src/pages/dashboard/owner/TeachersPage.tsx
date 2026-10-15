import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { dismissTeacher, listAllTeachers, signCvFile, type TeacherRow } from '@/lib/teachers'
import { listAllServicesForOwner, type Service } from '@/lib/services'
import { emptyExpert, expertWorkload, listExpertProfiles, saveExpertProfile, type ExpertProfile } from '@/lib/experts'
import { AI_BOT_USERNAME } from '@/lib/chat'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'

const statusClass: Record<string, string> = {
  active: 'bg-success-bg text-success',
  rejected: 'bg-error-bg text-error',
}

const chip = 'rounded-full border border-navy/10 bg-navy/[0.04] px-2.5 py-0.5 text-[11.5px] text-navy'

export function OwnerTeachersPage() {
  const { t, lang } = useLanguage()
  const ar = lang === 'ar'
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['all-teachers'], queryFn: listAllTeachers })
  const { data: experts } = useQuery({ queryKey: ['expert-profiles'], queryFn: listExpertProfiles })
  const { data: load } = useQuery({ queryKey: ['expert-workload'], queryFn: expertWorkload })
  const { data: services } = useQuery({ queryKey: ['owner-services'], queryFn: listAllServicesForOwner })
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [cvOpen, setCvOpen] = useState<string | null>(null)

  const openCv = async (path: string) => {
    const url = await signCvFile(path)
    if (url) window.open(url, '_blank')
  }

  const serviceTitle = (id: string) => services?.find((s) => s.id === id)?.title ?? ''
  // The AI assistant is a system account, not an expert you manage or dismiss.
  const shown = (data ?? [])
    .filter((tc) => tc.username !== AI_BOT_USERNAME)
    .filter((tc) => {
      if (!q.trim()) return true
      const ex = experts?.[tc.id]
      const hay = `${tc.name} ${tc.username} ${tc.specialty ?? ''} ${ex?.fields ?? ''} ${ex?.languages ?? ''} ${(ex?.service_ids ?? []).map(serviceTitle).join(' ')}`
      return hay.toLowerCase().includes(q.trim().toLowerCase())
    })

  const statusLabel = (s: string) =>
    s === 'active' ? t('oTeachers.active') : s === 'rejected' ? t('oTeachers.rejected') : s

  const dismiss = async (id: string, name: string) => {
    if (!confirm(t('oTeachers.confirmRemove', { name }))) return
    await dismissTeacher(id)
    void queryClient.invalidateQueries({ queryKey: ['all-teachers'] })
  }

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
        <div className="font-heading text-xl font-bold text-navy">{t('oTeachers.title')}</div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={ar ? 'بحث بالاسم أو الخدمة أو المجال…' : 'Search name, service or field…'}
          className="w-full max-w-xs rounded-lg border border-border bg-white px-3.5 py-2 text-[13px]"
        />
      </div>
      <div className="mb-5 text-[13px] text-muted">
        {ar
          ? 'حدّد لكل مدرّب الخدمات التي يقدّمها ومجالاته ونسبته — تُستخدم لاقتراح الأنسب عند إسناد الطلبات وحساب مستحقاته.'
          : 'Set what each trainer delivers, their fields and share — used to suggest the best match when assigning and to compute payouts.'}
      </div>

      {isLoading && <LoadingState />}
      {data && shown.length === 0 && <EmptyState title={t('oTeachers.none')} />}

      <div className="flex flex-col gap-3">
        {shown.map((tc) => {
          const ex = experts?.[tc.id]
          const l = load?.[tc.id] ?? { active: 0, done: 0 }
          return (
            <div key={tc.id} className="rounded-xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-navy">{tc.name}</div>
                  <div className="text-[12.5px] text-muted">
                    @{tc.username} {tc.specialty ? `· ${tc.specialty}` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-navy/[0.06] px-2.5 py-1 text-[11.5px] font-semibold text-navy">
                    {ar ? `${l.active} طلب نشط` : `${l.active} active`}
                  </span>
                  <span className="rounded-full bg-success-bg px-2.5 py-1 text-[11.5px] font-semibold text-success">
                    {ar ? `${l.done} مكتمل` : `${l.done} done`}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${statusClass[tc.status] ?? ''}`}>{statusLabel(tc.status)}</span>
                </div>
              </div>

              {ex && (ex.service_ids.length > 0 || ex.fields || ex.languages) ? (
                <div className="mt-3 flex flex-col gap-1.5 text-[12.5px]">
                  {ex.service_ids.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-muted">{ar ? 'الخدمات:' : 'Services:'}</span>
                      {ex.service_ids.map((id) => (
                        <span key={id} className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11.5px] font-semibold text-accent">
                          {serviceTitle(id)}
                        </span>
                      ))}
                    </div>
                  )}
                  {ex.fields && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-muted">{ar ? 'المجالات:' : 'Fields:'}</span>
                      {ex.fields.split(/[،,]/).map((f) => f.trim()).filter(Boolean).map((f) => (
                        <span key={f} className={chip}>{f}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-muted">
                    {ex.languages ? `${ar ? 'اللغات' : 'Languages'}: ${ex.languages} · ` : ''}
                    {ar ? 'النسبة' : 'Share'}: {ex.share_percent}%
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-lg bg-gold/[0.08] px-3 py-2 text-[12.5px] text-accent">
                  {ar ? 'لم تُحدَّد تخصصاته بعد — لن يُقترح تلقائيًا عند الإسناد.' : 'No specialties yet — won’t be suggested when assigning.'}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-2 pt-3">
                <button
                  onClick={() => setEditing(editing === tc.id ? null : tc.id)}
                  className="rounded-lg bg-navy px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-navy-hover"
                >
                  {editing === tc.id ? (ar ? 'إغلاق' : 'Close') : ar ? 'تعديل التخصصات والنسبة' : 'Edit specialties & share'}
                </button>
                {(tc.cv_text || tc.cv_file_url) && (
                  <button
                    onClick={() => setCvOpen(cvOpen === tc.id ? null : tc.id)}
                    className="rounded-lg border border-navy/20 px-3.5 py-1.5 text-[12.5px] font-semibold text-navy hover:border-navy"
                  >
                    {cvOpen === tc.id ? (ar ? 'إخفاء السيرة الذاتية' : 'Hide CV') : ar ? 'السيرة الذاتية' : 'CV'}
                  </button>
                )}
                {tc.status === 'active' && (
                  <button onClick={() => void dismiss(tc.id, tc.name)} className="text-[12px] text-muted underline-offset-2 hover:text-error hover:underline">
                    {t('oTeachers.remove')}
                  </button>
                )}
              </div>

              {cvOpen === tc.id && (
                <div className="mt-3 rounded-lg bg-bg-soft p-3.5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[12.5px] font-semibold text-navy">{ar ? 'السيرة الذاتية (تظهر لك فقط)' : 'CV (visible only to you)'}</div>
                    {tc.cv_file_url && (
                      <button onClick={() => void openCv(tc.cv_file_url!)} className="text-[12.5px] font-semibold text-navy underline">
                        {ar ? 'تحميل الملف المرفق' : 'Download attached file'}
                      </button>
                    )}
                  </div>
                  {tc.cv_text && <div className="whitespace-pre-wrap text-[13px] leading-7 text-muted-2">{tc.cv_text}</div>}
                </div>
              )}

              {editing === tc.id && (
                <ExpertEditor
                  teacher={tc}
                  initial={ex ?? emptyExpert(tc.id)}
                  services={services ?? []}
                  onSaved={() => {
                    setEditing(null)
                    void queryClient.invalidateQueries({ queryKey: ['expert-profiles'] })
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ExpertEditor({ teacher, initial, services, onSaved }: { teacher: TeacherRow; initial: ExpertProfile; services: Service[]; onSaved: () => void }) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const [p, setP] = useState<ExpertProfile>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const toggle = (id: string) =>
    setP((x) => ({ ...x, service_ids: x.service_ids.includes(id) ? x.service_ids.filter((s) => s !== id) : [...x.service_ids, id] }))

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await saveExpertProfile(p)
      onSaved()
    } catch {
      setError(ar ? 'تعذّر الحفظ — تأكد من تشغيل ملف قاعدة البيانات 0077.' : 'Could not save — make sure migration 0077 has run.')
    } finally {
      setBusy(false)
    }
  }

  const input = 'mt-1 block w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-[13px] text-navy'
  return (
    <div className="mt-3 rounded-lg bg-bg-soft p-3.5">
      <div className="mb-2 text-[12.5px] font-semibold text-navy">
        {ar ? `الخدمات التي يقدّمها ${teacher.name}` : `Services ${teacher.name} delivers`}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {services.map((s) => {
          const on = p.service_ids.includes(s.id)
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={`rounded-full border px-3 py-1 text-[12px] ${on ? 'border-navy bg-navy text-white' : 'border-border bg-white text-navy hover:border-navy/50'}`}
            >
              {on ? '✓ ' : ''}
              {s.title}
            </button>
          )
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[11.5px] font-semibold text-muted">
          {ar ? 'المجالات (افصل بفاصلة) — مثال: طب، تمريض، صحة عامة' : 'Fields (comma separated)'}
          <input value={p.fields} onChange={(e) => setP({ ...p, fields: e.target.value })} className={input} />
        </label>
        <label className="text-[11.5px] font-semibold text-muted">
          {ar ? 'اللغات — مثال: عربي، إنجليزي' : 'Languages'}
          <input value={p.languages} onChange={(e) => setP({ ...p, languages: e.target.value })} className={input} />
        </label>
        <label className="text-[11.5px] font-semibold text-muted">
          {ar ? 'نسبته الافتراضية من سعر الطلب (%)' : 'Default share of the request price (%)'}
          <input
            type="number"
            min={0}
            max={100}
            value={p.share_percent}
            onChange={(e) => setP({ ...p, share_percent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
            className={input}
          />
        </label>
        <label className="text-[11.5px] font-semibold text-muted">
          {ar ? 'ملاحظات خاصة (لا يراها المدرّب)' : 'Private notes'}
          <input value={p.notes ?? ''} onChange={(e) => setP({ ...p, notes: e.target.value || null })} className={input} />
        </label>
      </div>
      {error && <div className="mt-2 text-[12.5px] text-error">{error}</div>}
      <button
        onClick={() => void save()}
        disabled={busy}
        className="mt-3 rounded-lg bg-gold px-4 py-2 text-[13px] font-semibold text-navy hover:bg-gold-hover disabled:opacity-60"
      >
        {busy ? '…' : ar ? 'حفظ' : 'Save'}
      </button>
    </div>
  )
}
