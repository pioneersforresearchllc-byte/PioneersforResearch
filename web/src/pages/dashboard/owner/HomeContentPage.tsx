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
import {
  createTeamMember,
  deleteTeamMember,
  listAllTeamMembers,
  updateTeamMember,
  type TeamMember,
} from '@/lib/team'

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

function TeamMemberRow({ member, onChanged }: { member: TeamMember; onChanged: () => void }) {
  const { t } = useLanguage()
  const [name, setName] = useState(member.name)
  const [titleAr, setTitleAr] = useState(member.title_ar ?? '')
  const [titleEn, setTitleEn] = useState(member.title_en ?? '')
  const [bioAr, setBioAr] = useState(member.bio_ar ?? '')
  const [bioEn, setBioEn] = useState(member.bio_en ?? '')
  const [active, setActive] = useState(member.active)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setBusy(true)
    setSaved(false)
    try {
      await updateTeamMember(member.id, {
        name: name.trim(),
        title_ar: titleAr.trim() || null,
        title_en: titleEn.trim() || null,
        bio_ar: bioAr.trim() || null,
        bio_en: bioEn.trim() || null,
        active,
      })
      setSaved(true)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm(t('cms.team.confirmDelete'))) return
    await deleteTeamMember(member.id)
    onChanged()
  }

  const field = 'w-full rounded-md border border-border px-3 py-2 text-[13.5px]'
  return (
    <div className="rounded-lg border border-border-2 bg-bg-soft p-3.5">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('cms.team.namePh')} className={`${field} mb-2 font-semibold`} />
      <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder={t('cms.team.titleArPh')} className={field} />
        <input dir="ltr" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder={t('cms.team.titleEnPh')} className={field} />
        <textarea value={bioAr} onChange={(e) => setBioAr(e.target.value)} rows={2} placeholder={t('cms.team.bioArPh')} className={`${field} resize-y`} />
        <textarea dir="ltr" value={bioEn} onChange={(e) => setBioEn(e.target.value)} rows={2} placeholder={t('cms.team.bioEnPh')} className={`${field} resize-y`} />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-[12.5px] text-navy">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          {t('cms.team.visible')}
        </label>
        <div className="flex items-center gap-2">
          {saved && <span className="text-[12px] text-success">{t('homeContent.saved')}</span>}
          <button onClick={() => void remove()} className="rounded-md border border-error px-3 py-1.5 text-[12px] text-error hover:bg-error-bg">
            {t('dash.delete')}
          </button>
          <button
            onClick={() => void save()}
            disabled={busy}
            className="rounded-md bg-navy px-4 py-1.75 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
          >
            {t('homeContent.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

function TeamEditor() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: ['team-members-admin'], queryFn: listAllTeamMembers })
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['team-members-admin'] })
    void queryClient.invalidateQueries({ queryKey: ['team-members'] })
  }
  const add = async () => {
    await createTeamMember({
      name: '',
      title_ar: null,
      title_en: null,
      bio_ar: null,
      bio_en: null,
      sort_order: data?.length ?? 0,
      active: true,
    })
    refresh()
  }
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[14px] font-bold text-navy">{t('cms.team.title')}</div>
        <button onClick={() => void add()} className="rounded-md bg-navy px-3.5 py-1.75 text-[12.5px] font-semibold text-white hover:bg-navy-hover">
          {t('cms.team.add')}
        </button>
      </div>
      <div className="mb-2.5 text-[12.5px] text-muted">{t('cms.team.hint')}</div>
      <div className="flex flex-col gap-3">
        {(data ?? []).length === 0 && <div className="text-[12.5px] text-muted">{t('cms.team.empty')}</div>}
        {(data ?? []).map((m) => (
          <TeamMemberRow key={m.id} member={m} onChanged={refresh} />
        ))}
      </div>
    </div>
  )
}

function BankDetailsEditor({ content, onSaved }: { content: ContentMap | undefined; onSaved: () => void }) {
  const { t } = useLanguage()
  const [ar, setAr] = useState(content?.['bank.details']?.ar ?? '')
  const [en, setEn] = useState(content?.['bank.details']?.en ?? '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setBusy(true)
    setSaved(false)
    try {
      await saveSiteContent('bank.details', ar.trim(), en.trim())
      setSaved(true)
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full resize-y rounded-md border border-border px-3 py-2 text-[13.5px] font-[inherit]'
  return (
    <div>
      <div className="mb-1 text-[14px] font-bold text-navy">{t('cms.bank.title')}</div>
      <div className="mb-2.5 text-[12.5px] text-muted">{t('cms.bank.hint')}</div>
      <div className="rounded-lg border border-border-2 bg-bg-soft p-3.5">
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <textarea value={ar} onChange={(e) => setAr(e.target.value)} rows={4} placeholder={t('cms.bank.arPh')} className={field} />
          <textarea dir="ltr" value={en} onChange={(e) => setEn(e.target.value)} rows={4} placeholder={t('cms.bank.enPh')} className={field} />
        </div>
        <div className="flex items-center justify-end gap-2">
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
    </div>
  )
}

function AnnouncementEditor({ content, onSaved }: { content: ContentMap | undefined; onSaved: () => void }) {
  const { t } = useLanguage()
  const [enabled, setEnabled] = useState(!!content?.['announce.enabled']?.en)
  const [titleAr, setTitleAr] = useState(content?.['announce.title']?.ar ?? '')
  const [titleEn, setTitleEn] = useState(content?.['announce.title']?.en ?? '')
  const [bodyAr, setBodyAr] = useState(content?.['announce.body']?.ar ?? '')
  const [bodyEn, setBodyEn] = useState(content?.['announce.body']?.en ?? '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setBusy(true)
    setSaved(false)
    try {
      await saveSiteContent('announce.enabled', enabled ? '1' : '', enabled ? '1' : '')
      await saveSiteContent('announce.title', titleAr.trim(), titleEn.trim())
      await saveSiteContent('announce.body', bodyAr.trim(), bodyEn.trim())
      setSaved(true)
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full rounded-md border border-border px-3 py-2 text-[13.5px]'
  return (
    <div>
      <div className="mb-1 text-[14px] font-bold text-navy">{t('cms.announce.title')}</div>
      <div className="mb-2.5 text-[12.5px] text-muted">{t('cms.announce.hint')}</div>
      <div className="rounded-lg border border-border-2 bg-bg-soft p-3.5">
        <label className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-navy">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          {t('cms.announce.enabled')}
        </label>
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder={t('cms.announce.titleArPh')} className={field} />
          <input dir="ltr" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder={t('cms.announce.titleEnPh')} className={field} />
          <textarea value={bodyAr} onChange={(e) => setBodyAr(e.target.value)} rows={3} placeholder={t('cms.announce.bodyArPh')} className={`${field} resize-y`} />
          <textarea dir="ltr" value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} rows={3} placeholder={t('cms.announce.bodyEnPh')} className={`${field} resize-y`} />
        </div>
        <div className="flex items-center justify-end gap-2">
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
        <AnnouncementEditor key={content ? 'loaded' : 'loading'} content={content} onSaved={refresh} />
        <BankDetailsEditor key={content ? 'bank-loaded' : 'bank-loading'} content={content} onSaved={refresh} />
        <TeamEditor />
      </div>
    </div>
  )
}
