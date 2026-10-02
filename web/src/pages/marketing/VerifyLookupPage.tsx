import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/lib/i18n'

/** "Verify a certificate" entry point: type the code printed on the certificate. */
export function VerifyLookupPage() {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const c = code.trim()
    if (c) navigate(`/verify/${encodeURIComponent(c)}`)
  }

  return (
    <div className="bg-gradient-to-b from-[#e9eef5] to-white px-4 py-16 md:py-24">
      <div className="mx-auto max-w-xl rounded-3xl border border-border bg-white p-7 text-center shadow-[0_20px_50px_-30px_rgba(11,31,58,0.45)] md:p-10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-[30px]">🏅</div>
        <h1 className="font-heading mb-2 text-[24px] font-bold text-navy md:text-[30px]">{ar ? 'التحقق من شهادة' : 'Verify a certificate'}</h1>
        <p className="mb-6 text-[14.5px] leading-7 text-muted">
          {ar
            ? 'أدخل رقم الشهادة أو الرمز المطبوع عليها للتأكد من صحتها، أو امسح رمز QR الموجود على الشهادة.'
            : 'Enter the certificate number or code printed on it to confirm it is genuine, or scan its QR code.'}
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <input
            dir="ltr"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={ar ? 'رقم الشهادة' : 'Certificate number'}
            className="flex-1 rounded-xl border border-border px-4 py-3 text-center text-[15px] focus:border-navy focus:outline-none sm:text-start"
          />
          <button type="submit" disabled={!code.trim()} className="rounded-xl bg-navy px-6 py-3 text-[15px] font-semibold text-white disabled:opacity-50">
            {ar ? 'تحقّق' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  )
}
