import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { listInstitutions, rejectInstitution, verifyInstitution, type Institution } from '@/lib/institutions'

export function OwnerInstitutionsPage() {
  const { t, lang } = useLanguage()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['institutions'], queryFn: listInstitutions })
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['institutions'] })

  const verify = async (inst: Institution) => {
    await verifyInstitution(inst)
    refresh()
  }
  const reject = async (inst: Institution) => {
    if (!confirm(t('oInst.confirmReject'))) return
    await rejectInstitution(inst)
    refresh()
  }

  const orgTypeLabel = (v: string | null): string => {
    switch (v) {
      case 'hospital':
        return t('instType.hospital')
      case 'clinic':
        return t('instType.clinic')
      case 'center':
        return t('instType.center')
      case 'insurer':
        return t('instType.insurer')
      case 'gov':
        return t('instType.gov')
      case 'other':
        return t('instType.other')
      default:
        return v || '—'
    }
  }
  const fmt = (v: string) => new Date(v).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('oInst.title')}</div>
      {isLoading && <div className="text-muted">...</div>}
      {data && data.length === 0 && <div className="text-muted">{t('oInst.empty')}</div>}

      <div className="flex flex-col gap-3">
        {(data ?? []).map((inst) => (
          <div key={inst.id} className="rounded-xl border border-border bg-white p-5">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-[15.5px] font-semibold text-navy">{inst.name}</div>
                <div className="text-[12.5px] text-muted">
                  {orgTypeLabel(inst.org_type)}
                  {(inst.city || inst.country) ? ` · ${[inst.city, inst.country].filter(Boolean).join('، ')}` : ''}
                  {` · ${fmt(inst.created_at)}`}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                  inst.verified ? 'bg-success/10 text-success' : 'bg-gold/15 text-gold'
                }`}
              >
                {inst.verified ? t('oInst.verifiedBadge') : t('oInst.pendingBadge')}
              </span>
            </div>

            <div className="mb-3 grid grid-cols-1 gap-1.5 text-[13px] sm:grid-cols-2">
              <div>
                <span className="text-muted">{t('oInst.regNo')}: </span>
                <span className="text-navy">{inst.registration_number || '—'}</span>
              </div>
              <div>
                <span className="text-muted">{t('oInst.contact')}: </span>
                <span className="text-navy">
                  {[inst.contact_name, inst.contact_title].filter(Boolean).join(' — ') || '—'}
                </span>
              </div>
              <div>
                <span className="text-muted">{t('instApply.emailPh')}: </span>
                <span className="text-navy">{inst.contact_email || '—'}</span>
              </div>
              <div>
                <span className="text-muted">{t('instApply.phonePh')}: </span>
                <span className="text-navy" dir="ltr">{inst.contact_phone || '—'}</span>
              </div>
              {inst.consultation_type && (
                <div className="sm:col-span-2">
                  <span className="text-muted">{t('oInst.need')}: </span>
                  <span className="text-navy">{inst.consultation_type}</span>
                  {inst.size ? <span className="text-faint"> · {inst.size}</span> : null}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {!inst.verified && (
                <button
                  onClick={() => void verify(inst)}
                  className="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-hover"
                >
                  {t('oInst.verify')}
                </button>
              )}
              <button
                onClick={() => void reject(inst)}
                className="rounded-md border border-error px-4 py-2 text-[12.5px] text-error hover:bg-error-bg"
              >
                {t('oInst.reject')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
