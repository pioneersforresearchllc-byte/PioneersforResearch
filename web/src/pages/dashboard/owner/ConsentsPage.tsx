import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { legalDocsHash, listConsentEvidence, TERMS_VERSION, type AcceptanceRow, type ConsentRow } from '@/lib/legal'
import { LoadingState } from '@/components/LoadingState'

const KIND_LABEL: Record<string, { ar: string; en: string }> = {
  payment_no_refund: { ar: 'إقرار عدم الاسترداد عند الدفع', en: 'No-refund acknowledgement at payment' },
  marketing_opt_in: { ar: 'موافقة على الرسائل التسويقية', en: 'Marketing opt-in' },
  marketing_opt_out: { ar: 'سحب موافقة التسويق', en: 'Marketing opt-out' },
  sensitive_data: { ar: 'موافقة صريحة على معالجة البيانات الحساسة', en: 'Explicit consent to sensitive data' },
  service_request_terms: { ar: 'قبول الشروط عند إرسال طلب', en: 'Terms accepted on a service request' },
}

function csvCell(v: unknown) {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return
  const cols = Object.keys(rows[0])
  const body = [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n')
  // BOM so Excel opens Arabic text correctly.
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

/**
 * Owner: evidence of legal consents — who accepted which version of the
 * Terms (with the text fingerprint, server time, IP, browser), plus payment
 * no-refund acknowledgements, marketing choices and sensitive-data consents.
 * Rows survive account deletion and cannot be edited (migration 0074).
 */
export function OwnerConsentsPage() {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const { data, isLoading } = useQuery({ queryKey: ['consent-evidence', applied], queryFn: () => listConsentEvidence(applied) })
  const { data: hash } = useQuery({ queryKey: ['legal-docs-hash', TERMS_VERSION], queryFn: legalDocsHash, staleTime: Infinity })
  const fmt = (d: string) => new Date(d).toLocaleString(ar ? 'ar-SA' : 'en-GB', { timeZone: 'Asia/Riyadh' })
  const stamp = new Date().toISOString().slice(0, 10)

  const acc: AcceptanceRow[] = data?.acceptances ?? []
  const ev: ConsentRow[] = data?.events ?? []

  return (
    <div>
      <div className="mb-1 font-heading text-xl font-bold text-navy">{ar ? 'سجل الموافقات القانونية' : 'Legal consent records'}</div>
      <p className="mb-4 text-[13px] leading-6 text-muted">
        {ar
          ? 'دليل موافقة كل مستخدم على الشروط والسياسات، وإقرارات عدم الاسترداد عند الدفع، وموافقات التسويق والبيانات الحساسة. السجلات لا تُعدَّل ولا تُحذف، وتبقى حتى بعد حذف الحساب. الأوقات بتوقيت الرياض.'
          : 'Evidence of each user’s acceptance of the terms and policies, no-refund acknowledgements at payment, and marketing / sensitive-data consents. Records cannot be edited or deleted and survive account deletion. Times are Riyadh time.'}
      </p>
      <div className="mb-5 rounded-lg bg-bg-soft px-4 py-3 text-[12px] leading-6 text-navy" dir="ltr">
        Current version: <b>{TERMS_VERSION}</b> — SHA-256: <span className="break-all font-mono">{hash ?? '…'}</span>
      </div>

      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setApplied(search)}
          placeholder={ar ? 'ابحث بالبريد أو الاسم أو المرجع' : 'Search by email, name or reference'}
          className="flex-1 rounded-md border border-border px-3.5 py-2.5 text-[14px]"
        />
        <button onClick={() => setApplied(search)} className="rounded-md bg-navy px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-navy-hover">
          {ar ? 'بحث' : 'Search'}
        </button>
      </div>

      {isLoading && <LoadingState />}

      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-heading text-[15px] font-bold text-navy">
          {ar ? 'الموافقة على الشروط والسياسات' : 'Terms & policies acceptances'} ({acc.length})
        </div>
        <button
          onClick={() => downloadCsv(`terms-acceptances-${stamp}.csv`, acc as unknown as Record<string, unknown>[])}
          disabled={acc.length === 0}
          className="rounded-md border border-border px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-bg-soft disabled:opacity-50"
        >
          {ar ? 'تصدير CSV' : 'Export CSV'}
        </button>
      </div>
      <div className="mb-8 overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full min-w-[720px] text-[12.5px]">
          <thead className="bg-bg-soft text-muted-2">
            <tr>
              <th className="px-3 py-2 text-start">{ar ? 'المستخدم' : 'User'}</th>
              <th className="px-3 py-2 text-start">{ar ? 'الإصدار' : 'Version'}</th>
              <th className="px-3 py-2 text-start">{ar ? 'الوقت' : 'Time'}</th>
              <th className="px-3 py-2 text-start">IP</th>
              <th className="px-3 py-2 text-start">{ar ? 'المصدر' : 'Context'}</th>
              <th className="px-3 py-2 text-start">{ar ? 'بصمة النص' : 'Text hash'}</th>
            </tr>
          </thead>
          <tbody>
            {acc.map((r) => (
              <tr key={`${r.user_id}-${r.version}`} className="border-t border-border-2 align-top">
                <td className="px-3 py-2">
                  <div className="font-semibold text-navy">{r.full_name ?? '—'}</div>
                  <div className="text-muted" dir="ltr">{r.email ?? r.user_id}</div>
                </td>
                <td className="px-3 py-2" dir="ltr">{r.version}</td>
                <td className="px-3 py-2">{fmt(r.accepted_at)}</td>
                <td className="px-3 py-2" dir="ltr">{r.ip ?? '—'}</td>
                <td className="px-3 py-2">{r.context ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-[11px]" dir="ltr" title={r.doc_hash ?? ''}>
                  {r.doc_hash ? `${r.doc_hash.slice(0, 12)}…` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-heading text-[15px] font-bold text-navy">
          {ar ? 'الإقرارات والموافقات الأخرى' : 'Other acknowledgements & consents'} ({ev.length})
        </div>
        <button
          onClick={() => downloadCsv(`consent-events-${stamp}.csv`, ev as unknown as Record<string, unknown>[])}
          disabled={ev.length === 0}
          className="rounded-md border border-border px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-bg-soft disabled:opacity-50"
        >
          {ar ? 'تصدير CSV' : 'Export CSV'}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full min-w-[720px] text-[12.5px]">
          <thead className="bg-bg-soft text-muted-2">
            <tr>
              <th className="px-3 py-2 text-start">{ar ? 'المستخدم' : 'User'}</th>
              <th className="px-3 py-2 text-start">{ar ? 'النوع' : 'Kind'}</th>
              <th className="px-3 py-2 text-start">{ar ? 'المرجع' : 'Reference'}</th>
              <th className="px-3 py-2 text-start">{ar ? 'الوقت' : 'Time'}</th>
              <th className="px-3 py-2 text-start">IP</th>
              <th className="px-3 py-2 text-start">{ar ? 'الإصدار' : 'Version'}</th>
            </tr>
          </thead>
          <tbody>
            {ev.map((r) => (
              <tr key={r.id} className="border-t border-border-2 align-top">
                <td className="px-3 py-2">
                  <div className="font-semibold text-navy">{r.full_name ?? '—'}</div>
                  <div className="text-muted" dir="ltr">{r.email ?? r.user_id ?? '—'}</div>
                </td>
                <td className="px-3 py-2">{KIND_LABEL[r.kind]?.[lang] ?? r.kind}</td>
                <td className="px-3 py-2" dir="ltr">{r.ref ?? '—'}</td>
                <td className="px-3 py-2">{fmt(r.created_at)}</td>
                <td className="px-3 py-2" dir="ltr">{r.ip ?? '—'}</td>
                <td className="px-3 py-2" dir="ltr">{r.terms_version ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
