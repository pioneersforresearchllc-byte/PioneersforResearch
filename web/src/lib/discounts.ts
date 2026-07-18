import { supabase } from '@/lib/supabase'

export interface DiscountCode {
  id: string
  code: string
  percent_off: number
  course_id: string | null
  service_id: string | null
  starts_at: string | null
  ends_at: string | null
  active: boolean
  created_at: string
}

export type DiscountCodeInput = Omit<DiscountCode, 'id' | 'created_at'>

export async function listDiscountCodes(): Promise<DiscountCode[]> {
  const { data, error } = await supabase.from('discount_codes').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as DiscountCode[]) ?? []
}

export async function createDiscountCode(values: DiscountCodeInput) {
  const { error } = await supabase.from('discount_codes').insert({ ...values, code: values.code.trim().toUpperCase() })
  if (error) throw error
}

export async function updateDiscountCode(id: string, values: Partial<DiscountCodeInput>) {
  const { error } = await supabase.from('discount_codes').update(values).eq('id', id)
  if (error) throw error
}

export async function deleteDiscountCode(id: string) {
  const { error } = await supabase.from('discount_codes').delete().eq('id', id)
  if (error) throw error
}
