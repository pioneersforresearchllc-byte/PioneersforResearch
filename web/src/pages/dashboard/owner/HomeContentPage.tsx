import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { translations } from '@/lib/translations'
import {
  EDITABLE_CONTENT,
  fetchSiteContent,
  resolveSocialLink,
  saveSiteContent,
  SOCIAL_KEYS,
  type ContentKey,
  type ContentMap,
  type SocialKey,
} from '@/lib/content'

const SOCIAL_LABELS: Record<SocialKey, string> = {
  'social.instagram': 'Instagram',
  'social.x': 'X (Twitter)',
  'social.discord': 'Discord',
}

function SocialRow({ storeKey, current, onSaved }: { storeKey: SocialKey; current: string; onSaved: () => void }) {
  const { t } = useLanguage()
  const [url, setUrl] = useState(current)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setBusy(true)
    setSaved(false)
    try {
      // Store the same value in both columns; the footer reads value_en. An
      // empty value is saved as a row (value null) so the icon hides.
      await saveSiteContent(storeKey, url.trim(), url.trim())
      setSaved(true)
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-border-2 bg-bg-soft p-3.5">
      <div className="w-24 shrink-0 text-[13px] font-semibold text-navy">{SOCIAL_LABELS[storeKey]}</div>
      <input
        dir="ltr"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={t('cms.social.urlPh')}
        className="min-w-0 flex-1 rounded-md border border-border px-3 py-2 text-[13.5px]"
      />
      {saved && <span className="text-[12px] text-success">{t('homeContent.saved')}</span>}
      <button
        onClick={() => void save()}
        disabled={busy}
        className="rounded-md bg-navy px-4 py-1.75 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
      >
        {t('homeContent.save')}
      </button>
    </div>
  )
}

function SocialLinksEditor({ content, onSaved }: { content: ContentMap | undefined; onSaved: () => void }) {
  const { t } = useLanguage()
  return (
    <div>
      <div className="mb-1 text-[14px] font-bold text-navy">{t('cms.social.title')}</div>
      <div className="mb-2.5 text-[12.5px] text-muted">{t('cms.social.hint')}</div>
      <div className="flex flex-col gap-3">
        {SOCIAL_KEYS.map((key) => (
          <SocialRow key={key} storeKey={key} current={resolveSocialLink(content, key)} onSaved={onSaved} />
        ))}
      </div>
    </div>
  )
}

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
          <div key={section.groupKey}>
            <div className="mb-2.5 text-[14px] font-bold text-navy">{t(section.groupKey)}</div>
            <div className="flex flex-col gap-3">
              {section.keys.map(({ key, labelKey }) => (
                <Row
                  key={key}
                  contentKey={key}
                  label={t(labelKey)}
                  currentAr={content?.[key]?.ar ?? translations[key].ar}
                  currentEn={content?.[key]?.en ?? translations[key].en}
                  onSaved={refresh}
                />
              ))}
            </div>
          </div>
        ))}

        <SocialLinksEditor content={content} onSaved={refresh} />
      </div>
    </div>
  )
}
