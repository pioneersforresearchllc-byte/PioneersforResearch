// Single source of truth for the company's legal identity, used on the finance
// statement and on every issued invoice (on-site and in email).
export const IDENTITY = {
  nameAr: 'شركة بايونيرز هيلث ريسيرتش كونسالتينج (ذ.م.م)',
  nameEn: 'Pioneers Health Research Consulting LLC',
  unified: '7055175363',
  tax: '3150160068',
  misa: '24926274626',
  address: 'JHJA8230',
}

export const VAT_RATE = 0.15

/** A short, human-readable invoice number derived from the row id. */
export function invoiceNumber(id: string): string {
  return `INV-${id.slice(0, 8).toUpperCase()}`
}

/** Treats the stored amount as VAT-inclusive and splits out the tax. */
export function vatBreakdown(totalCents: number): { base: number; vat: number; total: number } {
  const base = Math.round(totalCents / (1 + VAT_RATE))
  return { base, vat: totalCents - base, total: totalCents }
}
