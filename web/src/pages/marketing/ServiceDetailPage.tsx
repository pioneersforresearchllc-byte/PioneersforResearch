import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import {
  getServiceBySlug,
  submitServiceRequest,
  uploadRequestFile,
  type CustomAnswer,
  type ServicePackage,
  type ServiceQuestion,
} from '@/lib/services'

const MAX_FILE_BYTES = 20 * 1024 * 1024

function formatSar(cents: number, currency: string) {
  return `${(cents / 100).toLocaleString('ar-SA')} ${currency}`
}

/**
 * Which brief fields each service asks for. Keyed by the service's stable
 * slug so renaming a service's title never changes its form.
 */
interface FormLayout {
  quantityLabelKey: 'service.slides' | 'service.sampleSize'
  showTargetAudience: boolean
  showBrandColors: boolean
  softwareChoices?: string[]
}

const LAYOUTS: Record<string, FormLayout> = {
  presentation: {
    quantityLabelKey: 'service.slides',
    showTargetAudience: true,
    showBrandColors: true,
  },
  'research-data-analysis': {
    quantityLabelKey: 'service.sampleSize',
    showTargetAudience: false,
    showBrandColors: false,
    softwareChoices: ['SPSS', 'R', 'Python', 'Excel', 'any'],
  },
}

const DEFAULT_LAYOUT: FormLayout = {
  quantityLabelKey: 'service.slides',
  showTargetAudience: true,
  showBrandColors: true,
}

const inputClass = 'w-full box-border rounded-md border border-border px-3.5 py-2.5 text-[14px]'
const labelClass = 'mb-1.5 block text-[12.5px] font-semibold text-navy'

export function ServiceDetailPage() {
  const { slug } = useParams()
  const { session, profile } = useAuth()
  const { t, lang } = useLanguage()
  const { data: service, isLoading } = useQuery({
    queryKey: ['service', slug],
    enabled: !!slug,
    queryFn: () => getServiceBySlug(slug!),
  })

  const [selected, setSelected] = useState<ServicePackage | null>(null)
  const [fullName, setFullName] = useState(profile?.name ?? '')
  const [email, setEmail] = useState(session?.user.email ?? '')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [purpose, setPurpose] = useState('')
  const [audience, setAudience] = useState('')
  const [quantity, setQuantity] = useState('')
  const [language, setLanguage] = useState('العربية')
  const [contentText, setContentText] = useState('')
  const [contentFile, setContentFile] = useState<File | null>(null)
  const [brandColors, setBrandColors] = useState('')
  const [referenceUrl, setReferenceUrl] = useState('')
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [software, setSoftware] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [qFiles, setQFiles] = useState<Record<string, File | null>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (isLoading) return <div className="px-4 py-12 text-center text-muted md:px-16 md:py-20">...</div>
  if (!service) {
    return (
      <div className="px-4 py-12 text-center md:px-16 md:py-20">
        <div className="mb-4 text-muted">{t('service.notFound')}</div>
        <Link to="/#services" className="text-navy no-underline">
          {t('service.back')}
        </Link>
      </div>
    )
  }

  const layout = LAYOUTS[service.slug] ?? DEFAULT_LAYOUT
  // Questions the owner turned off for this service (0051). Missing column → [].
  const hidden = new Set<string>(service.hidden_fields ?? [])
  const showField = (k: string) => !hidden.has(k)
  const title = lang === 'en' ? service.title_en || service.title : service.title
  const description = lang === 'en' ? service.description_en || service.description : service.description

  const pkgTitle = (p: ServicePackage) => (lang === 'en' ? p.title_en || p.title : p.title)
  const pkgDesc = (p: ServicePackage) => (lang === 'en' ? p.description_en || p.description : p.description)

  const questions = service.questions ?? []
  const hasCustom = questions.length > 0
  const qLabel = (q: ServiceQuestion) => (lang === 'en' ? q.label_en || q.label : q.label)
  const qOptions = (q: ServiceQuestion) => (lang === 'en' && q.options_en?.length ? q.options_en : q.options ?? [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError(t('service.errContact'))
      return
    }
    if (!subject.trim()) {
      setError(t('service.errSubject'))
      return
    }
    if (!deliveryDate) {
      setError(t('service.errDate'))
      return
    }

    if (hasCustom) {
      for (const q of questions) {
        if (!q.required) continue
        const missing = q.type === 'file' ? !qFiles[q.id] : !(answers[q.id] ?? '').trim()
        if (missing) {
          setError(t('service.errRequiredQ', { label: qLabel(q) }))
          return
        }
      }
      for (const q of questions) {
        const f = qFiles[q.id]
        if (f && f.size > MAX_FILE_BYTES) {
          setError(t('service.errFileSize'))
          return
        }
      }
    } else {
      if (showField('quantity') && (!quantity.trim() || Number.isNaN(Number(quantity)))) {
        setError(t('service.errQuantity'))
        return
      }
      // Either ready content to format, or a written brief — one is enough.
      if (!contentText.trim() && !contentFile) {
        setError(t('service.errContent'))
        return
      }
      for (const f of [contentFile, referenceFile]) {
        if (f && f.size > MAX_FILE_BYTES) {
          setError(t('service.errFileSize'))
          return
        }
      }
    }

    setBusy(true)
    try {
      let contentPath: string | null = null
      let referencePath: string | null = null
      let customAnswers: CustomAnswer[] | null = null

      if (hasCustom) {
        customAnswers = []
        for (const q of questions) {
          if (q.type === 'file') {
            const f = qFiles[q.id]
            if (f) {
              const path = await uploadRequestFile(f)
              customAnswers.push({ label: q.label, label_en: q.label_en ?? null, type: q.type, value: path, fileName: f.name })
            }
          } else {
            const v = (answers[q.id] ?? '').trim()
            if (v) customAnswers.push({ label: q.label, label_en: q.label_en ?? null, type: q.type, value: v })
          }
        }
      } else {
        ;[contentPath, referencePath] = await Promise.all([
          contentFile ? uploadRequestFile(contentFile) : Promise.resolve(null),
          referenceFile ? uploadRequestFile(referenceFile) : Promise.resolve(null),
        ])
      }

      await submitServiceRequest({
        service_id: service.id,
        package_id: selected?.id ?? null,
        // Must match auth.uid() — the insert policy rejects anything else.
        user_id: session?.user.id ?? null,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        subject: subject.trim(),
        purpose: hasCustom ? null : purpose.trim() || null,
        target_audience: hasCustom ? null : audience.trim() || null,
        quantity: !hasCustom && showField('quantity') ? Number(quantity) : null,
        language: hasCustom ? null : language,
        content_text: hasCustom ? null : contentText.trim() || null,
        content_file_url: contentPath,
        brand_colors: hasCustom ? null : brandColors.trim() || null,
        reference_url: hasCustom ? null : referenceUrl.trim() || null,
        reference_file_url: referencePath,
        delivery_date: deliveryDate,
        details: !hasCustom && software ? { software } : {},
        custom_answers: customAnswers,
      })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('service.errSubmit'))
    } finally {
      setBusy(false)
    }
  }

  if (submitted) {
    return (
      <div className="px-4 py-12 md:px-16 md:py-20">
        <div className="mx-auto max-w-140 rounded-xl border border-success/30 bg-success/5 p-8 text-center">
          <div className="font-heading mb-2 text-xl font-bold text-navy">{t('service.thanksTitle')}</div>
          <div className="mb-5 text-[14.5px] leading-7 text-muted">{t('service.thanksBody')}</div>
          <Link to="/" className="text-[13.5px] font-semibold text-navy no-underline">
            {t('course.backHome')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-12 md:px-16 md:py-20">
      <Link to="/#services" className="mb-5 inline-block text-[13px] text-muted no-underline">
        {t('service.back')}
      </Link>

      <div className="mx-auto max-w-160">
        <h1 className="font-heading mb-3 text-[26px] font-bold text-navy">{title}</h1>
        <p className="mb-8 text-[15.5px] leading-[2] text-muted-2">{description}</p>

        {/* DIRECT PRICE — for a service sold without packages */}
        {service.packages.length === 0 && service.price_cents != null && (
          <div className="mb-8 flex flex-wrap items-baseline gap-3 rounded-xl border border-border bg-bg-soft/60 p-5">
            <span className="text-[13px] font-semibold text-muted">{t('service.price')}</span>
            {service.original_price_cents != null && service.original_price_cents > service.price_cents && (
              <span className="text-[15px] text-faint line-through">{formatSar(service.original_price_cents, t('course.currency'))}</span>
            )}
            <span className="text-[22px] font-bold text-navy">{formatSar(service.price_cents, t('course.currency'))}</span>
          </div>
        )}

        {/* PACKAGES */}
        {service.packages.length > 0 && (
        <div className="mb-8">
          <div className="mb-3.5 font-heading text-lg font-bold text-navy">{t('service.choosePackage')}</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {service.packages.map((p) => {
              const isSelected = selected?.id === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p)}
                  className={`rounded-xl border p-4 text-right transition-colors ${
                    isSelected ? 'border-navy bg-navy/5' : 'border-border bg-white hover:border-navy/40'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[15px] font-semibold text-navy">{pkgTitle(p)}</span>
                    <span className="flex shrink-0 items-baseline gap-2 text-[15px] font-bold text-navy">
                      {p.is_custom || p.price_cents == null ? (
                        t('service.contactUs')
                      ) : (
                        <>
                          {p.original_price_cents != null && p.original_price_cents > p.price_cents && (
                            <span className="text-[12.5px] font-normal text-faint line-through">
                              {formatSar(p.original_price_cents, t('course.currency'))}
                            </span>
                          )}
                          <span>{formatSar(p.price_cents, t('course.currency'))}</span>
                        </>
                      )}
                    </span>
                  </div>
                  {pkgDesc(p) && <div className="text-[12.5px] leading-6 text-muted">{pkgDesc(p)}</div>}
                </button>
              )
            })}
          </div>
        </div>
        )}

        {/* REQUEST FORM — sign-in only, matching the insert policy on
            service_requests (the DB is the real gate; this is just so a
            signed-out visitor sees a clear prompt instead of a failing form). */}
        {!session ? (
          <div className="rounded-xl border border-border bg-white p-8 text-center">
            <div className="mb-2 font-heading text-lg font-bold text-navy">{t('service.loginRequiredTitle')}</div>
            <div className="mb-5 text-[14px] leading-7 text-muted">{t('service.loginRequiredBody')}</div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/login"
                className="rounded-md bg-navy px-6 py-2.75 text-[14px] font-semibold text-white no-underline hover:bg-navy-hover"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="rounded-md border border-navy px-6 py-2.75 text-[14px] font-semibold text-navy no-underline hover:bg-bg-soft"
              >
                {t('nav.register')}
              </Link>
            </div>
          </div>
        ) : (
        <form onSubmit={submit} className="rounded-xl border border-border bg-white p-5 md:p-7">
          <div className="mb-5 font-heading text-lg font-bold text-navy">{t('service.formTitle')}</div>

          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>{t('service.fullName')} *</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('service.email')} *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('service.phone')} *</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="mb-3">
            <label className={labelClass}>{t('service.subject')} *</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} />
          </div>

          {/* CUSTOM QUESTIONS — when the owner has defined them for this service */}
          {hasCustom &&
            questions.map((q) => (
              <div key={q.id} className="mb-3">
                <label className={labelClass}>
                  {qLabel(q)} {q.required && '*'}
                </label>
                {q.type === 'long' ? (
                  <textarea
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    rows={4}
                    className={`${inputClass} resize-y font-[inherit]`}
                  />
                ) : q.type === 'number' ? (
                  <input type="number" value={answers[q.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} className={inputClass} />
                ) : q.type === 'date' ? (
                  <input type="date" value={answers[q.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} className={inputClass} />
                ) : q.type === 'select' ? (
                  <select value={answers[q.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} className={inputClass}>
                    <option value="">—</option>
                    {qOptions(q).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : q.type === 'file' ? (
                  <input type="file" onChange={(e) => setQFiles((f) => ({ ...f, [q.id]: e.target.files?.[0] ?? null }))} className="text-[13px]" />
                ) : (
                  <input value={answers[q.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} className={inputClass} />
                )}
              </div>
            ))}

          {!hasCustom && (
          <>
          {(showField('purpose') || (layout.showTargetAudience && showField('audience'))) && (
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {showField('purpose') && (
                <div>
                  <label className={labelClass}>{t('service.purpose')}</label>
                  <input
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder={t('service.purposePh')}
                    className={inputClass}
                  />
                </div>
              )}
              {layout.showTargetAudience && showField('audience') && (
                <div>
                  <label className={labelClass}>{t('service.audience')}</label>
                  <input value={audience} onChange={(e) => setAudience(e.target.value)} className={inputClass} />
                </div>
              )}
            </div>
          )}

          {(showField('quantity') || showField('language')) && (
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {showField('quantity') && (
                <div>
                  <label className={labelClass}>{t(layout.quantityLabelKey)} *</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
              {showField('language') && (
                <div>
                  <label className={labelClass}>{t('service.language')}</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
                    <option value="العربية">{t('service.langAr')}</option>
                    <option value="English">{t('service.langEn')}</option>
                    <option value="ثنائي اللغة">{t('service.langBoth')}</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {layout.softwareChoices && showField('software') && (
            <div className="mb-5">
              <label className={labelClass}>{t('service.software')}</label>
              <select value={software} onChange={(e) => setSoftware(e.target.value)} className={inputClass}>
                <option value="">—</option>
                {layout.softwareChoices.map((s) => (
                  <option key={s} value={s}>
                    {s === 'any' ? t('service.anySoftware') : s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* CORE CONTENT — one of the two */}
          <div className="mb-5 rounded-lg bg-bg-soft p-4">
            <div className="mb-1 text-[13.5px] font-semibold text-navy">{t('service.contentTitle')} *</div>
            <div className="mb-3 text-[12px] leading-6 text-muted">{t('service.contentHint')}</div>
            <label className={labelClass}>{t('service.uploadContent')}</label>
            <input
              type="file"
              onChange={(e) => setContentFile(e.target.files?.[0] ?? null)}
              className="mb-3 text-[13px]"
            />
            <label className={labelClass}>{t('service.orDescribe')}</label>
            <textarea
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              rows={4}
              placeholder={t('service.describePh')}
              className={`${inputClass} resize-y font-[inherit]`}
            />
          </div>

          {/* DESIGN REQUIREMENTS */}
          <div className="mb-5">
            <div className="mb-2 text-[13.5px] font-semibold text-navy">{t('service.designTitle')}</div>
            {layout.showBrandColors && showField('brand_colors') && (
              <div className="mb-3">
                <label className={labelClass}>{t('service.colors')}</label>
                <input
                  value={brandColors}
                  onChange={(e) => setBrandColors(e.target.value)}
                  placeholder={t('service.colorsPh')}
                  className={inputClass}
                />
              </div>
            )}
            {showField('reference') && (
              <>
                <div className="mb-3">
                  <label className={labelClass}>{t('service.referenceUrl')}</label>
                  <input
                    value={referenceUrl}
                    onChange={(e) => setReferenceUrl(e.target.value)}
                    placeholder="https://"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('service.referenceFile')}</label>
                  <input
                    type="file"
                    onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)}
                    className="text-[13px]"
                  />
                </div>
              </>
            )}
          </div>
          </>
          )}

          <div className="mb-5">
            <label className={labelClass}>{t('service.deliveryDate')} *</label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && <div className="mb-3 text-[13.5px] text-error">{error}</div>}

          <button
            type="submit"
            disabled={busy}
            className="btn-sheen w-full rounded-xl bg-navy py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(11,31,58,0.6)] transition-all hover:bg-navy-hover active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? '...' : t('service.submit')}
          </button>
          <div className="mt-2.5 text-center text-[12px] text-muted">{t('service.paymentNote')}</div>
        </form>
        )}
      </div>
    </div>
  )
}
