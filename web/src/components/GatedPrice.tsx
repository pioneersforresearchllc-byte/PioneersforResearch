import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { fetchSiteContent, pricingGateOn } from '@/lib/content'
import { Price } from '@/components/Riyal'

/**
 * A price that the owner can hide from logged-out visitors. When the pricing
 * gate is on and no one is signed in, it shows a "sign in to view the price"
 * link (to register) instead of the number — a lead-capture nudge. Otherwise
 * it renders the normal price.
 */
export function GatedPrice({ cents }: { cents: number }) {
  const { session } = useAuth()
  const { t } = useLanguage()
  const { data: content } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })

  if (!session && pricingGateOn(content)) {
    return (
      <Link
        to="/register"
        className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 text-[12.5px] font-semibold text-navy no-underline hover:bg-gold/25"
      >
        {t('pricing.loginToView')}
      </Link>
    )
  }
  return <Price cents={cents} locale="ar-SA" />
}
