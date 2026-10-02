import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listServices } from '@/lib/services'
import { fetchSiteContent, resolveWhatsapp } from '@/lib/content'
import { getLeadSource, leadSourceLine } from '@/lib/attribution'

/**
 * "Get a quote" wizard. Prices are quoted per request, so instead of a price
 * list the visitor answers four short steps; the result reaches the team
 * either as a pre-filled WhatsApp message or as a contact message on the site
 * (owner dashboard → Contact messages). No account needed.
 */
export function QuotePage() {
  const { lang } = useLanguage()
  const { profile, session } = useAuth()
  const ar = lang === 'ar'
  const tx = (a: string, e: string) => (ar ? a : e)
  const { data: services } = useQuery({ queryKey: ['marketing-services'], queryFn: listServices })
  const { data: content } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  const wa = resolveWhatsapp(content)

  const STAGES = ar
    ? ['بكالوريوس', 'ماجستير', 'دكتوراه', 'زمالة / برنامج تخصصي', 'باحث مستقل', 'أخرى']
    : ['Bachelor', 'Master', 'PhD', 'Fellowship / residency', 'Independent researcher', 'Other']

  const [step, setStep] = useState(0)
  const [service, setService] = useState('')
  const [stage, setStage] = useState('')
  const [field, setField] = useState('')
  const [deadline, setDeadline] = useState('')
  const [details, setDetails] = useState('')
  const [name, setName] = useState(profile?.name ?? '')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState(session?.user.email ?? '')
  const HEARD = ar
    ? ['إنستقرام', 'تيك توك', 'سناب شات', 'قوقل', 'واتساب', 'صديق أو زميل', 'أخرى']
    : ['Instagram', 'TikTok', 'Snapchat', 'Google', 'WhatsApp', 'Friend or colleague', 'Other']
  // Pre-select from the tracked source when it's obvious (e.g. arrived from an Instagram ad).
  const tracked = getLeadSource()?.source.toLowerCase() ?? ''
  const guess = /insta|facebook|fb/.test(tracked) ? HEARD[0] : /tiktok/.test(tracked) ? HEARD[1] : /snap/.test(tracked) ? HEARD[2] : /google/.test(tracked) ? HEARD[3] : /whatsapp/.test(tracked) ? HEARD[4] : ''
  const [heard, setHeard] = useState(guess)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const otherService = tx('غير متأكد / خدمة أخرى', 'Not sure / other')
  const serviceOptions = [
    ...(services ?? []).map((s) => (ar ? s.title : s.title_en || s.title)),
    otherService,
  ]

  const steps = [tx('الخدمة', 'Service'), tx('عنك', 'About you'), tx('طلبك', 'Your request'), tx('التواصل', 'Contact')]

  const canNext = [!!service, !!stage && !!field.trim(), !!details.trim(), !!name.trim() && (!!phone.trim() || !!email.trim())][step]

  const summary = () =>
    [
      tx('طلب عرض سعر', 'Quote request'),
      `${tx('الخدمة', 'Service')}: ${service}`,
      `${tx('المرحلة', 'Stage')}: ${stage}`,
      `${tx('التخصص', 'Field')}: ${field.trim()}`,
      deadline ? `${tx('موعد التسليم', 'Deadline')}: ${deadline}` : '',
      `${tx('التفاصيل', 'Details')}: ${details.trim()}`,
      `${tx('الاسم', 'Name')}: ${name.trim()}`,
      phone.trim() ? `${tx('الجوال', 'Phone')}: ${phone.trim()}` : '',
      email.trim() ? `${tx('البريد', 'Email')}: ${email.trim()}` : '',
      heard ? `${tx('عرفنا عن طريق', 'Heard via')}: ${heard}` : '',
      leadSourceLine(lang),
    ]
      .filter(Boolean)
      .join('\n')

  const sendSite = async () => {
    setError('')
    if (!email.trim()) {
      setError(tx('أدخل بريدك الإلكتروني للإرسال عبر الموقع، أو أرسل عبر واتساب.', 'Enter your email to send via the site, or use WhatsApp.'))
      return
    }
    setBusy(true)
    try {
      const { error: err } = await supabase.from('contact_messages').insert({ name: name.trim(), email: email.trim(), message: summary() })
      if (err) {
        setError(tx('تعذر الإرسال، حاول مجددًا أو أرسل عبر واتساب.', 'Could not send. Try again or use WhatsApp.'))
        return
      }
      setSent(true)
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full rounded-xl border border-border bg-white px-4 py-3 text-[15px] text-navy focus:border-navy focus:outline-none'
  const chip = (active: boolean) =>
    `rounded-xl border px-4 py-3 text-[14.5px] font-semibold transition-all text-start ${
      active ? 'border-navy bg-navy text-white shadow-[0_8px_20px_-10px_rgba(11,31,58,0.7)]' : 'border-border bg-white text-navy hover:border-navy/50'
    }`

  if (sent) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-[30px] text-success">✓</div>
        <h1 className="font-heading mb-2 text-2xl font-bold text-navy">{tx('وصلنا طلبك!', 'We got your request!')}</h1>
        <p className="mb-6 text-[15px] leading-8 text-muted">
          {tx('سنراجع التفاصيل ونرسل لك عرض السعر والخطة الزمنية في أقرب وقت.', 'We’ll review the details and send your quote and timeline shortly.')}
        </p>
        <Link to="/" className="rounded-full bg-navy px-7 py-3 text-[14.5px] font-semibold text-white no-underline">
          {tx('العودة للرئيسية', 'Back to home')}
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-b from-[#e9eef5] to-white px-4 py-10 md:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mb-2 text-[13px] font-semibold tracking-[2px] text-accent">{tx('عرض سعر مخصّص', 'TAILORED QUOTE')}</div>
          <h1 className="font-heading text-[26px] font-bold text-navy md:text-[34px]">{tx('اطلب عرض سعر لطلبك', 'Get a quote for your request')}</h1>
          <p className="mt-2 text-[15px] text-muted">{tx('أربع خطوات سريعة — بدون التزام.', 'Four quick steps — no commitment.')}</p>
        </div>

        {/* progress */}
        <div className="mb-6 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
              <div className={`h-1.5 w-full rounded-full transition-colors ${i <= step ? 'bg-gold' : 'bg-navy/10'}`} />
              <span className={`text-[12px] ${i === step ? 'font-bold text-navy' : 'text-muted'}`}>{s}</span>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 shadow-[0_20px_50px_-30px_rgba(11,31,58,0.45)] md:p-8">
          {step === 0 && (
            <div>
              <h2 className="mb-4 text-[18px] font-bold text-navy">{tx('ما الخدمة التي تحتاجها؟', 'Which service do you need?')}</h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {serviceOptions.map((s) => (
                  <button key={s} type="button" onClick={() => setService(s)} className={chip(service === s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="mb-4 text-[18px] font-bold text-navy">{tx('مرحلتك الدراسية', 'Your academic stage')}</h2>
              <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {STAGES.map((s) => (
                  <button key={s} type="button" onClick={() => setStage(s)} className={chip(stage === s)}>
                    {s}
                  </button>
                ))}
              </div>
              <label className="mb-1.5 block text-[14px] font-semibold text-navy">{tx('تخصصك', 'Your field')}</label>
              <input value={field} onChange={(e) => setField(e.target.value)} placeholder={tx('مثال: تمريض، صحة عامة، طب أسنان', 'e.g. Nursing, Public health')} className={input} />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="mb-4 text-[18px] font-bold text-navy">{tx('أخبرنا عن طلبك', 'Tell us about your request')}</h2>
              <label className="mb-1.5 block text-[14px] font-semibold text-navy">{tx('موعد التسليم (اختياري)', 'Deadline (optional)')}</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${input} mb-4`} />
              <label className="mb-1.5 block text-[14px] font-semibold text-navy">{tx('التفاصيل', 'Details')}</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={5}
                placeholder={tx('عنوان البحث أو فكرته، وما المطلوب تحديدًا، وأي ملاحظات من مشرفك…', 'Your topic, exactly what you need, any notes from your supervisor…')}
                className={`${input} resize-y`}
              />
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="mb-4 text-[18px] font-bold text-navy">{tx('كيف نتواصل معك؟', 'How do we reach you?')}</h2>
              <div className="flex flex-col gap-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tx('الاسم', 'Name')} className={input} />
                <input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={tx('رقم الجوال / واتساب', 'Mobile / WhatsApp')} className={`${input} text-start`} />
                <input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={tx('البريد الإلكتروني', 'Email')} className={`${input} text-start`} />
              </div>
              <div className="mt-4">
                <div className="mb-2 text-[14px] font-semibold text-navy">{tx('كيف عرفت عنّا؟', 'How did you hear about us?')}</div>
                <div className="flex flex-wrap gap-2">
                  {HEARD.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHeard(h)}
                      className={`rounded-full border px-3.5 py-1.5 text-[13px] ${heard === h ? 'border-navy bg-navy text-white' : 'border-border bg-white text-navy'}`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-[12.5px] leading-6 text-muted">
                {tx('بإرسالك الطلب توافق على ', 'By sending you agree to our ')}
                <Link to="/terms" target="_blank" className="font-semibold text-navy">
                  {tx('الشروط', 'Terms')}
                </Link>
                {tx(' و', ' and ')}
                <Link to="/privacy" target="_blank" className="font-semibold text-navy">
                  {tx('سياسة الخصوصية', 'Privacy Policy')}
                </Link>
                .
              </p>
              {error && <div className="mt-3 rounded-lg bg-error-bg px-3 py-2 text-[13px] text-error">{error}</div>}
              <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {wa && (
                  <a
                    href={`https://wa.me/${wa}?text=${encodeURIComponent(summary())}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => canNext && setTimeout(() => setSent(true), 400)}
                    className={`flex items-center justify-center gap-2 rounded-xl bg-[#1fa855] px-4 py-3.5 text-[15px] font-bold text-white no-underline ${canNext ? '' : 'pointer-events-none opacity-50'}`}
                  >
                    {tx('أرسل عبر واتساب', 'Send via WhatsApp')}
                  </a>
                )}
                <button
                  type="button"
                  disabled={!canNext || busy}
                  onClick={() => void sendSite()}
                  className="rounded-xl bg-navy px-4 py-3.5 text-[15px] font-bold text-white disabled:opacity-50"
                >
                  {busy ? '...' : tx('أرسل عبر الموقع', 'Send via the site')}
                </button>
              </div>
            </div>
          )}

          <div className="mt-7 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className={`text-[14px] font-semibold text-muted hover:text-navy ${step === 0 ? 'invisible' : ''}`}
            >
              {tx('→ السابق', '← Back')}
            </button>
            {step < 3 && (
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setStep((s) => s + 1)}
                className="rounded-full bg-gold px-7 py-3 text-[15px] font-bold text-navy shadow-[0_10px_24px_-12px_rgba(201,162,75,0.9)] disabled:opacity-40"
              >
                {tx('التالي ←', 'Next →')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
