import { supabase } from '@/lib/supabase'

export type PaymentMethod = 'cash' | 'bank' | 'transfer'
export type ManualKind = 'course' | 'service' | 'other'

export interface ManualPayment {
  id: string
  kind: ManualKind
  course_id: string | null
  service_id: string | null
  description: string
  payer_name: string | null
  amount_cents: number
  method: PaymentMethod
  paid_at: string
  note: string | null
  created_at: string
}

export interface ManualPaymentInput {
  kind: ManualKind
  course_id: string | null
  service_id: string | null
  description: string
  payer_name: string | null
  amount_cents: number
  method: PaymentMethod
  paid_at: string
  note: string | null
}

/** A single revenue line for the financial statement — online or manual. */
export interface FinanceEntry {
  id: string
  source: 'online' | 'manual'
  date: string // ISO or YYYY-MM-DD
  description: string
  customer: string
  method: string // 'بطاقة/Stripe' | cash | bank | transfer
  kind: 'course' | 'service' | 'other'
  amount_cents: number
}

export async function listManualPayments(): Promise<ManualPayment[]> {
  const { data, error } = await supabase.from('manual_payments').select('*').order('paid_at', { ascending: false })
  if (error) return [] // deploy-safe: table not migrated yet
  return (data ?? []) as ManualPayment[]
}

export async function addManualPayment(input: ManualPaymentInput) {
  const { error } = await supabase.from('manual_payments').insert(input)
  if (error) throw error
}

export async function deleteManualPayment(id: string) {
  const { error } = await supabase.from('manual_payments').delete().eq('id', id)
  if (error) throw error
}

/** Owner removes an online (Stripe) payment row — e.g. clearing test data. */
export async function deleteOnlinePayment(id: string) {
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) throw error
}
