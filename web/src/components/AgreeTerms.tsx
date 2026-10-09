import { Link } from 'react-router-dom'
import { useLanguage } from '@/lib/i18n'

/** "I agree to the Terms, Privacy and Refund policies" tick used on every signup form. */
export function AgreeTerms({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const a = (to: string, label: string) => (
    <Link to={to} target="_blank" className="font-semibold text-navy underline underline-offset-2">
      {label}
    </Link>
  )
  return (
    <label className="flex items-start gap-2.5 text-[12.5px] leading-6 text-muted">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {ar ? 'قرأت وأوافق على ' : 'I have read and agree to the '}
        {a('/terms', ar ? 'الشروط والأحكام' : 'Terms & Conditions')}
        {ar ? ' و' : ', '}
        {a('/privacy', ar ? 'سياسة الخصوصية' : 'Privacy Policy')}
        {ar ? ' و' : ' and '}
        {a('/refund', ar ? 'سياسة الاسترجاع والإلغاء' : 'Refund & Cancellation Policy')}
        {ar ? '.' : '.'}
      </span>
    </label>
  )
}
