import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import {
  createPackage,
  createService,
  deletePackage,
  deleteService,
  listAllServicesForOwner,
  updatePackage,
  updateService,
  updateServiceHiddenFields,
  uploadServiceImage,
  TOGGLEABLE_SERVICE_FIELDS,
  type Service,
  type ServicePackage,
  type ServiceQuestion,
  type QuestionType,
} from '@/lib/services'
import { LoadingState } from '@/components/LoadingState'

const QUESTION_TYPES: QuestionType[] = ['short', 'long', 'number', 'select', 'date', 'file']

function genQid(): string {
  return `q_${Math.random().toString(36).slice(2, 8)}`
}

/** Owner tool: build the custom questions a service's request form asks. */
function QuestionsEditor({ value, onChange }: { value: ServiceQuestion[]; onChange: (q: ServiceQuestion[]) => void }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const update = (i: number, patch: Partial<ServiceQuestion>) =>
    onChange(value.map((q, idx) => (idx === i ? { ...q, ...patch } : q)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= value.length) return
    const next = [...value]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const add = () => onChange([...value, { id: genQid(), label: '', type: 'short', required: false }])

  return (
    <div className="mt-3 rounded-lg border border-dashed border-border-2 bg-bg-soft/60 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-start"
      >
        <span className="text-[11.5px] font-semibold text-muted">
          {t('adminServices.questionsBuilder')}
          {value.length > 0 && <span className="ms-1 text-accent">({value.length})</span>}
        </span>
        <span className={`text-[13px] text-muted transition-transform ${open ? 'rotate-90' : ''}`}>‹</span>
      </button>

      {!open && (
        <div className="mt-1 text-[11px] text-faint">
          {value.length > 0 ? t('adminServices.questionsCollapsed') : t('adminServices.questionsBuilderHint')}
        </div>
      )}

      {open && (
        <div className="mt-2.5">
          <div className="mb-1.5 text-[11px] text-faint">{t('adminServices.questionsBuilderHint')}</div>

          <div className="flex flex-col gap-2.5">
        {value.map((q, i) => (
          <div key={q.id} className="rounded-lg border border-border bg-white p-2.5">
            <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={q.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder={t('adminServices.qLabelPh')}
                className={inputClass}
              />
              <input
                value={q.label_en ?? ''}
                onChange={(e) => update(i, { label_en: e.target.value })}
                dir="ltr"
                placeholder={t('adminServices.qLabelEnPh')}
                className={inputClass}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={q.type} onChange={(e) => update(i, { type: e.target.value as QuestionType })} className="rounded-md border border-border px-2 py-1.5 text-[12.5px]">
                {QUESTION_TYPES.map((tp) => (
                  <option key={tp} value={tp}>
                    {t(`adminServices.qType.${tp}` as 'adminServices.qType.short')}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-[12px] text-navy">
                <input type="checkbox" checked={!!q.required} onChange={(e) => update(i, { required: e.target.checked })} className="h-3.5 w-3.5" />
                {t('adminServices.qRequired')}
              </label>
              <div className="ms-auto flex items-center gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-1.5 text-[13px] text-muted hover:text-navy disabled:opacity-30">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === value.length - 1} className="rounded px-1.5 text-[13px] text-muted hover:text-navy disabled:opacity-30">↓</button>
                <button onClick={() => remove(i)} className="rounded px-1.5 text-[13px] text-faint hover:text-error">🗑</button>
              </div>
            </div>
            {q.type === 'select' && (
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={(q.options ?? []).join('، ')}
                  onChange={(e) => update(i, { options: e.target.value.split(/[،,]/).map((x) => x.trim()).filter(Boolean) })}
                  placeholder={t('adminServices.qOptionsPh')}
                  className={inputClass}
                />
                <input
                  value={(q.options_en ?? []).join(', ')}
                  onChange={(e) => update(i, { options_en: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
                  dir="ltr"
                  placeholder={t('adminServices.qOptionsEnPh')}
                  className={inputClass}
                />
              </div>
            )}
          </div>
        ))}
      </div>

          <button onClick={add} className="mt-2.5 rounded-md border border-navy/50 px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-white">
            + {t('adminServices.addQuestion')}
          </button>
        </div>
      )}
    </div>
  )
}

const inputClass = 'w-full box-border rounded-md border border-border px-3 py-2 text-[13.5px]'

/** Editable service name (Arabic + English) — owner only. */
function ServiceHeader({ service, onSaved }: { service: Service; onSaved: () => void }) {
  const { t } = useLanguage()
  const [title, setTitle] = useState(service.title)
  const [titleEn, setTitleEn] = useState(service.title_en ?? '')
  const [desc, setDesc] = useState(service.description ?? '')
  const [descEn, setDescEn] = useState(service.description_en ?? '')
  const [priceRiyal, setPriceRiyal] = useState(service.price_cents != null ? String(service.price_cents / 100) : '')
  const [originalRiyal, setOriginalRiyal] = useState(
    service.original_price_cents != null ? String(service.original_price_cents / 100) : '',
  )
  const [hidden, setHidden] = useState<string[]>(service.hidden_fields ?? [])
  const [questions, setQuestions] = useState<ServiceQuestion[]>(service.questions ?? [])
  const [imageUrl, setImageUrl] = useState<string | null>(service.image_url)
  const [hidePrice, setHidePrice] = useState(service.hide_price)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const sortedKey = (a: string[]) => [...a].sort().join(',')
  const curPrice = service.price_cents != null ? String(service.price_cents / 100) : ''
  const curOriginal = service.original_price_cents != null ? String(service.original_price_cents / 100) : ''
  const dirty =
    title.trim() !== service.title ||
    (titleEn.trim() || '') !== (service.title_en ?? '') ||
    desc.trim() !== (service.description ?? '') ||
    (descEn.trim() || '') !== (service.description_en ?? '') ||
    priceRiyal.trim() !== curPrice ||
    originalRiyal.trim() !== curOriginal ||
    imageUrl !== service.image_url ||
    hidePrice !== service.hide_price ||
    JSON.stringify(questions) !== JSON.stringify(service.questions ?? []) ||
    sortedKey(hidden) !== sortedKey(service.hidden_fields ?? [])

  const toggleField = (k: string) =>
    setHidden((h) => (h.includes(k) ? h.filter((x) => x !== k) : [...h, k]))

  const onImage = async (f: File) => {
    setUploadingImg(true)
    setError('')
    try {
      setImageUrl(await uploadServiceImage(f))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setUploadingImg(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      await deleteService(service.id)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  const save = async () => {
    if (!title.trim()) {
      setError(t('adminServices.nameRequired'))
      return
    }
    setBusy(true)
    setSaved(false)
    setError('')
    try {
      await updateService(service.id, {
        title: title.trim(),
        title_en: titleEn.trim() || null,
        description: desc.trim(),
        description_en: descEn.trim() || null,
        price_cents: priceRiyal.trim() ? Math.round(Number(priceRiyal) * 100) : null,
        original_price_cents: originalRiyal.trim() ? Math.round(Number(originalRiyal) * 100) : null,
        image_url: imageUrl,
        hide_price: hidePrice,
        questions: questions.filter((q) => q.label.trim()).length ? questions.filter((q) => q.label.trim()) : null,
      })
      await updateServiceHiddenFields(service.id, hidden)
      setSaved(true)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-4 border-b border-border-2 pb-4">
      {/* Service card image */}
      <div className="mb-3">
        <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('adminServices.image')}</label>
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-16 w-28 shrink-0 rounded-lg border border-border object-cover" />
          ) : (
            <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-border-2 bg-bg-soft text-[22px]">🧩</div>
          )}
          <div className="flex flex-col gap-1.5">
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void onImage(e.target.files[0])} className="text-[12px]" />
            <div className="flex items-center gap-2">
              {uploadingImg && <span className="text-[11.5px] text-muted">{t('adminServices.uploading')}</span>}
              {imageUrl && (
                <button type="button" onClick={() => setImageUrl(null)} className="text-[11.5px] text-error hover:underline">
                  {t('adminServices.removeImage')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('adminServices.serviceName')}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('adminServices.serviceNameEn')}</label>
          <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" className={inputClass} />
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('adminServices.descAr')}</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className={`${inputClass} resize-y`} />
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('adminServices.descEn')}</label>
          <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={3} dir="ltr" className={`${inputClass} resize-y`} />
        </div>
      </div>

      {/* Direct price — used on the card/detail when the service has no packages. */}
      <div className="mt-2.5 rounded-lg border border-dashed border-border-2 bg-bg-soft/60 p-3">
        <div className="mb-1.5 text-[11.5px] font-semibold text-muted">{t('adminServices.directPrice')}</div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] text-faint">{t('adminServices.price')}</label>
            <input type="number" min={0} value={priceRiyal} onChange={(e) => setPriceRiyal(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-faint">{t('adminServices.originalPrice')}</label>
            <input type="number" min={0} value={originalRiyal} onChange={(e) => setOriginalRiyal(e.target.value)} placeholder={t('adminServices.originalPricePh')} className={inputClass} />
          </div>
        </div>
        <div className="mt-1 text-[11px] text-faint">{t('adminServices.directPriceHint')}</div>
        <label className="mt-2 flex items-center gap-2 text-[12.5px] font-medium text-navy">
          <input type="checkbox" checked={hidePrice} onChange={(e) => setHidePrice(e.target.checked)} className="h-4 w-4" />
          {t('adminServices.hidePrice')}
        </label>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-[11.5px] font-semibold text-muted">{t('adminServices.questionsTitle')}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {TOGGLEABLE_SERVICE_FIELDS.map((k) => (
            <label key={k} className="flex items-center gap-1.5 text-[12.5px] text-navy">
              <input type="checkbox" checked={!hidden.includes(k)} onChange={() => toggleField(k)} className="h-3.5 w-3.5" />
              {t(`adminServices.field.${k}` as 'adminServices.field.purpose')}
            </label>
          ))}
        </div>
        <div className="mt-1 text-[11px] text-faint">{t('adminServices.questionsHint')}</div>
      </div>

      <QuestionsEditor value={questions} onChange={setQuestions} />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] text-faint">/{service.slug}</span>
        <div className="flex flex-wrap items-center gap-2">
          {saved && <span className="text-[12px] text-success">{t('adminServices.saved')}</span>}
          {error && <span className="text-[12px] text-error">{error}</span>}
          {confirmDelete ? (
            <>
              <span className="text-[12px] text-error">{t('adminServices.confirmDeleteService')}</span>
              <button onClick={() => void remove()} disabled={busy} className="rounded-md bg-error px-3 py-1.75 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
                {t('adminServices.confirmYes')}
              </button>
              <button onClick={() => setConfirmDelete(false)} disabled={busy} className="rounded-md border border-border px-3 py-1.75 text-[12.5px] text-navy hover:bg-white">
                {t('adminServices.cancel')}
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="rounded-md border border-error/40 px-3 py-1.75 text-[12.5px] font-semibold text-error hover:bg-error/5">
              {t('adminServices.deleteService')}
            </button>
          )}
          <button
            onClick={() => void save()}
            disabled={busy || !dirty}
            className="rounded-md bg-navy px-4 py-1.75 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
          >
            {t('adminServices.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

function PackageRow({ pkg, onSaved }: { pkg: ServicePackage; onSaved: () => void }) {
  const { t } = useLanguage()
  const [title, setTitle] = useState(pkg.title)
  const [description, setDescription] = useState(pkg.description ?? '')
  // Prices are stored in cents (halalas); the owner edits whole riyals.
  const [priceRiyal, setPriceRiyal] = useState(pkg.price_cents != null ? String(pkg.price_cents / 100) : '')
  const [originalRiyal, setOriginalRiyal] = useState(
    pkg.original_price_cents != null ? String(pkg.original_price_cents / 100) : '',
  )
  const [isCustom, setIsCustom] = useState(pkg.is_custom)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      await deletePackage(pkg.id)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  const save = async () => {
    setBusy(true)
    setSaved(false)
    setError('')
    try {
      await updatePackage(pkg.id, {
        title: title.trim(),
        description: description.trim() || null,
        price_cents: priceRiyal.trim() ? Math.round(Number(priceRiyal) * 100) : null,
        original_price_cents: originalRiyal.trim() ? Math.round(Number(originalRiyal) * 100) : null,
        is_custom: isCustom,
      })
      setSaved(true)
      onSaved()
    } catch (e) {
      // Surface the real reason instead of silently doing nothing — most often
      // RLS rejecting the write because the owner's OTP session has expired.
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-border-2 bg-bg-soft p-3.5">
      <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('adminServices.packageTitle')}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('adminServices.price')}</label>
          <input
            type="number"
            min={0}
            value={priceRiyal}
            onChange={(e) => setPriceRiyal(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div className="mb-2.5">
        <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('adminServices.originalPrice')}</label>
        <input
          type="number"
          min={0}
          value={originalRiyal}
          onChange={(e) => setOriginalRiyal(e.target.value)}
          placeholder={t('adminServices.originalPricePh')}
          className={inputClass}
        />
        {originalRiyal.trim() && Number(originalRiyal) > Number(priceRiyal || 0) && (
          <div className="mt-1 text-[11.5px] text-muted">
            {t('adminServices.discountPreview')}{' '}
            <span className="text-faint line-through">{Number(originalRiyal).toLocaleString('en-US')}</span>{' '}
            <span className="font-semibold text-navy">{Number(priceRiyal || 0).toLocaleString('en-US')}</span>
          </div>
        )}
      </div>
      <div className="mb-2.5">
        <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('adminServices.packageDesc')}</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[12.5px] text-navy">
          <input type="checkbox" checked={isCustom} onChange={(e) => setIsCustom(e.target.checked)} className="h-4 w-4" />
          {t('adminServices.custom')}
        </label>
        <div className="flex items-center gap-2">
          {saved && <span className="text-[12px] text-success">{t('adminServices.saved')}</span>}
          {error && <span className="text-[12px] text-error">{error}</span>}
          {confirmDelete ? (
            <>
              <span className="text-[12px] text-error">{t('adminServices.confirmDelete')}</span>
              <button
                onClick={() => void remove()}
                disabled={busy}
                className="rounded-md bg-error px-3 py-1.75 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {t('adminServices.confirmYes')}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
                className="rounded-md border border-border px-3 py-1.75 text-[12.5px] text-navy hover:bg-white"
              >
                {t('adminServices.cancel')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
                className="rounded-md border border-error/40 px-3 py-1.75 text-[12.5px] font-semibold text-error hover:bg-error/5 disabled:opacity-50"
              >
                {t('adminServices.delete')}
              </button>
              <button
                onClick={() => void save()}
                disabled={busy}
                className="rounded-md bg-navy px-4 py-1.75 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
              >
                {t('adminServices.save')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function AddServiceForm({ onCreated }: { onCreated: () => void }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [desc, setDesc] = useState('')
  const [descEn, setDescEn] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const create = async () => {
    if (!title.trim()) {
      setError(t('adminServices.nameRequired'))
      return
    }
    setBusy(true)
    setError('')
    try {
      await createService({
        title: title.trim(),
        title_en: titleEn.trim() || null,
        description: desc.trim(),
        description_en: descEn.trim() || null,
      })
      setTitle(''); setTitleEn(''); setDesc(''); setDescEn(''); setOpen(false)
      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="self-start rounded-lg border border-navy bg-navy px-4 py-2 text-[13px] font-semibold text-white hover:bg-navy-hover">
        + {t('adminServices.addService')}
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-navy/30 bg-white p-5">
      <div className="mb-3 font-heading text-[15px] font-bold text-navy">{t('adminServices.addService')}</div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('adminServices.serviceName')} className={inputClass} />
        <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" placeholder={t('adminServices.serviceNameEn')} className={inputClass} />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder={t('adminServices.descAr')} className={`${inputClass} resize-y`} />
        <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={2} dir="ltr" placeholder={t('adminServices.descEn')} className={`${inputClass} resize-y`} />
      </div>
      {error && <div className="mt-2 text-[12px] text-error">{error}</div>}
      <div className="mt-3 flex items-center gap-2">
        <button onClick={() => void create()} disabled={busy} className="rounded-md bg-navy px-4 py-1.75 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50">
          {t('adminServices.create')}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-md border border-border px-4 py-1.75 text-[12.5px] text-navy hover:bg-bg-soft">
          {t('adminServices.cancel')}
        </button>
      </div>
    </div>
  )
}

function AddPackageButton({ serviceId, onAdded }: { serviceId: string; onAdded: () => void }) {
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  const add = async () => {
    setBusy(true)
    try {
      await createPackage(serviceId)
      onAdded()
    } finally {
      setBusy(false)
    }
  }
  return (
    <button onClick={() => void add()} disabled={busy} className="self-start rounded-md border border-navy/50 px-3.5 py-1.75 text-[12.5px] font-semibold text-navy hover:bg-bg-soft disabled:opacity-50">
      + {t('adminServices.addPackage')}
    </button>
  )
}

export function OwnerServicesPage() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { data: services, isLoading } = useQuery({ queryKey: ['owner-services'], queryFn: listAllServicesForOwner })
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['owner-services'] })

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('adminServices.title')}</div>
      <div className="mb-5 text-[13.5px] text-muted">{t('adminServices.subtitle')}</div>

      {isLoading && <LoadingState />}

      <div className="mb-5">
        <AddServiceForm onCreated={refresh} />
      </div>

      <div className="flex flex-col gap-5">
        {(services ?? []).map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-white p-5">
            <ServiceHeader service={s} onSaved={refresh} />
            <div className="flex flex-col gap-3">
              {s.packages.length === 0 && (
                <div className="rounded-lg border border-dashed border-border-2 bg-bg-soft/50 px-3 py-2.5 text-[12px] text-muted">
                  {t('adminServices.noPackages')}
                </div>
              )}
              {s.packages.map((p) => (
                <PackageRow key={p.id} pkg={p} onSaved={refresh} />
              ))}
              <AddPackageButton serviceId={s.id} onAdded={refresh} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
