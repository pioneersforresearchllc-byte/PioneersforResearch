import { useLanguage } from '@/lib/i18n'
import { PHONE_COUNTRIES } from '@/lib/phone'

/** Country code picker + number input (WhatsApp). Value is kept raw; normalize with normalizePhone(). */
export function PhoneField({
  country,
  number,
  onCountry,
  onNumber,
  className = '',
}: {
  country: string
  number: string
  onCountry: (code: string) => void
  onNumber: (v: string) => void
  className?: string
}) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  return (
    <div dir="ltr" className={`flex gap-2 ${className}`}>
      <select
        value={country}
        onChange={(e) => onCountry(e.target.value)}
        aria-label={ar ? 'رمز الدولة' : 'Country code'}
        className="w-[118px] shrink-0 rounded-xl border border-border bg-white px-2 py-3 text-[14px] text-navy focus:border-navy focus:outline-none"
      >
        {PHONE_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            +{c.code} {ar ? c.ar : c.en}
          </option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={number}
        onChange={(e) => onNumber(e.target.value)}
        placeholder={country === '966' ? '05XXXXXXXX' : ar ? 'رقم الجوال' : 'Mobile number'}
        className="min-w-0 flex-1 rounded-xl border border-border bg-white px-4 py-3 text-[15px] text-navy focus:border-navy focus:outline-none"
      />
    </div>
  )
}
