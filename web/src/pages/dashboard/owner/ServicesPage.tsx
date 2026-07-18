import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { listAllServicesForOwner, updatePackage, type ServicePackage } from '@/lib/services'

const inputClass = 'w-full box-border rounded-md border border-border px-3 py-2 text-[13.5px]'

function PackageRow({ pkg, onSaved }: { pkg: ServicePackage; onSaved: () => void }) {
  const { t } = useLanguage()
  const [title, setTitle] = useState(pkg.title)
  const [description, setDescription] = useState(pkg.description ?? '')
  // Prices are stored in cents (halalas); the owner edits whole riyals.
  const [priceRiyal, setPriceRiyal] = useState(pkg.price_cents != null ? String(pkg.price_cents / 100) : '')
  const [isCustom, setIsCustom] = useState(pkg.is_custom)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setBusy(true)
    setSaved(false)
    setError('')
    try {
      await updatePackage(pkg.id, {
        title: title.trim(),
        description: description.trim() || null,
        price_cents: priceRiyal.trim() ? Math.round(Number(priceRiyal) * 100) : null,
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
          <button
            onClick={() => void save()}
            disabled={busy}
            className="rounded-md bg-navy px-4 py-1.75 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
          >
            {t('adminServices.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function OwnerServicesPage() {
  const { t, lang } = useLanguage()
  const queryClient = useQueryClient()
  const { data: services, isLoading } = useQuery({ queryKey: ['owner-services'], queryFn: listAllServicesForOwner })
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['owner-services'] })

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('adminServices.title')}</div>
      <div className="mb-5 text-[13.5px] text-muted">{t('adminServices.subtitle')}</div>

      {isLoading && <div className="text-muted">...</div>}

      <div className="flex flex-col gap-5">
        {(services ?? []).map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-white p-5">
            <div className="mb-1 font-heading text-[16px] font-bold text-navy">
              {lang === 'en' ? s.title_en || s.title : s.title}
            </div>
            <div className="mb-4 text-[12.5px] text-muted">/{s.slug}</div>
            <div className="flex flex-col gap-3">
              {s.packages.map((p) => (
                <PackageRow key={p.id} pkg={p} onSaved={refresh} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
