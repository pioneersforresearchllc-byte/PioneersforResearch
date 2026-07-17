import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import {
  getServiceBySlug,
  submitServiceRequest,
  uploadRequestFile,
  type ServicePackage,
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
    softwareChoices: ['SPSS', 'R', 'Python', 'Excel', 'أي برنامج'],
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
  const { profile } = useAuth()
  const { t, lang } = useLanguage()
  const { data: service, isLoading } = useQuery({
    queryKey: ['service', slug],
    enabled: !!slug,
    queryFn: () => getServiceBySlug(slug!),
  })

  const [selected, setSelected] = useState<ServicePackage | null>(null)
  const [fullName, setFullName] = useState(profile?.name ?? '')
  const [email, setEmail] = useState('')
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
  const title = lang === 'en' ? service.title_en || service.title : service.title
  const description = lang === 'en' ? service.description_en || service.description : service.description

  const pkgTitle = (p: ServicePackage) => (lang === 'en' ? p.title_en || p.title : p.title)
  const pkgDesc = (p: ServicePackage) => (lang === 'en' ? p.description_en || p.description : p.description)

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
    if (!quantity.trim() || Number.isNaN(Number(quantity))) {
      setError(t('service.errQuantity'))
      return
    }
    // Either ready content to format, or a written brief — one is enough.
    if (!contentText.trim() && !contentFile) {
      setError(t('service.errContent'))
      return
    }
    if (!deliveryDate) {
      setError(t('service.errDate'))
      return
    }
    for (const f of [contentFile, referenceFile]) {
      if (f && f.size > MAX_FILE_BYTES) {
        setError(t('service.errFileSize'))
        return
      }
    }

    setBusy(true)
    try {
      const [contentPath, referencePath] = await Promise.all([
        contentFile ? uploadRequestFile(contentFile) : Promise.resolve(null),
        referenceFile ? uploadRequestFile(referenceFile) : Promise.resolve(null),
      ])

      await submitServiceRequest({
        service_id: service.id,
        package_id: selected?.id ?? null,
        user_id: profile?.id ?? null,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        subject: subject.trim(),
        purpose: purpose.trim() || null,
        target_audience: audience.trim() || null,
        quantity: Number(quantity),
        language,
        content_text: contentText.trim() || null,
        content_file_url: contentPath,
        brand_colors: brandColors.trim() || null,
        reference_url: referenceUrl.trim() || null,
        reference_file_url: referencePath,
        delivery_date: deliveryDate,
        details: software ? { software } : {},
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

        {/* PACKAGES */}
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
                    <span className="shrink-0 text-[15px] font-bold text-navy">
                      {p.is_custom || p.price_cents == null
                        ? t('service.contactUs')
                        : formatSar(p.price_cents, t('course.currency'))}
                    </span>
                  </div>
                  {pkgDesc(p) && <div className="text-[12.5px] leading-6 text-muted">{pkgDesc(p)}</div>}
                </button>
              )
            })}
          </div>
        </div>

        {/* REQUEST FORM */}
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

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('service.purpose')}</label>
              <input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder={t('service.purposePh')}
                className={inputClass}
              />
            </div>
            {layout.showTargetAudience && (
              <div>
                <label className={labelClass}>{t('service.audience')}</label>
                <input value={audience} onChange={(e) => setAudience(e.target.value)} className={inputClass} />
              </div>
            )}
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <div>
              <label className={labelClass}>{t('service.language')}</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
                <option value="العربية">{t('service.langAr')}</option>
                <option value="English">{t('service.langEn')}</option>
                <option value="ثنائي اللغة">{t('service.langBoth')}</option>
              </select>
            </div>
          </div>

          {layout.softwareChoices && (
            <div className="mb-5">
              <label className={labelClass}>{t('service.software')}</label>
              <select value={software} onChange={(e) => setSoftware(e.target.value)} className={inputClass}>
                <option value="">—</option>
                {layout.softwareChoices.map((s) => (
                  <option key={s} value={s}>
                    {s}
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
            {layout.showBrandColors && (
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
          </div>

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
            className="w-full rounded-md bg-navy py-3.5 text-[15px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
          >
            {busy ? '...' : t('service.submit')}
          </button>
          <div className="mt-2.5 text-center text-[12px] text-muted">{t('service.paymentNote')}</div>
        </form>
      </div>
    </div>
  )
}
