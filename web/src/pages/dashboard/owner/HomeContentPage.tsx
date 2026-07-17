import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { translations } from '@/lib/translations'
import { EDITABLE_CONTENT, fetchSiteContent, saveSiteContent, type ContentKey } from '@/lib/content'

function Row({
  contentKey,
  label,
  currentAr,
  currentEn,
  onSaved,
}: {
  contentKey: ContentKey
  label: string
  currentAr: string
  currentEn: string
  onSaved: () => void
}) {
  const { t } = useLanguage()
  const [ar, setAr] = useState(currentAr)
  const [en, setEn] = useState(currentEn)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const long = (translations[contentKey]?.ar.length ?? 0) > 60

  const save = async () => {
    setBusy(true)
    setSaved(false)
    try {
      await saveSiteContent(contentKey, ar.trim(), en.trim())
      setSaved(true)
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  const fieldClass = 'w-full resize-y rounded-md border border-border px-3 py-2 text-[13.5px]'

  return (
    <div className="rounded-lg border border-border-2 bg-bg-soft p-3.5">
      <div className="mb-2 text-[13px] font-semibold text-navy">{label}</div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[11.5px] text-muted">العربية</div>
          {long ? (
            <textarea value={ar} onChange={(e) => setAr(e.target.value)} rows={4} className={fieldClass} />
          ) : (
            <input value={ar} onChange={(e) => setAr(e.target.value)} className={fieldClass} />
          )}
        </div>
        <div dir="ltr">
          <div className="mb-1 text-[11.5px] text-muted">English</div>
          {long ? (
            <textarea value={en} onChange={(e) => setEn(e.target.value)} rows={4} className={fieldClass} />
          ) : (
            <input value={en} onChange={(e) => setEn(e.target.value)} className={fieldClass} />
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-2">
        {saved && <span className="text-[12px] text-success">{t('homeContent.saved')}</span>}
        <button
          onClick={() => void save()}
          disabled={busy}
          className="rounded-md bg-navy px-4 py-1.75 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {t('homeContent.save')}
        </button>
      </div>
    </div>
  )
}

export function OwnerHomeContentPage() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { data: content, isLoading } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['site-content'] })

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('homeContent.title')}</div>
      <div className="mb-5 text-[13.5px] text-muted">{t('homeContent.subtitle')}</div>

      {isLoading && <div className="text-muted">...</div>}

      <div className="flex flex-col gap-6">
        {EDITABLE_CONTENT.map((section) => (
          <div key={section.group}>
            <div className="mb-2.5 text-[14px] font-bold text-navy">{section.group}</div>
            <div className="flex flex-col gap-3">
              {section.keys.map(({ key, label }) => (
                <Row
                  key={key}
                  contentKey={key}
                  label={label}
                  currentAr={content?.[key]?.ar ?? translations[key].ar}
                  currentEn={content?.[key]?.en ?? translations[key].en}
                  onSaved={refresh}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
