import { supabase } from '@/lib/supabase'

export interface DiscountTarget {
  course_id: string | null
  service_id: string | null
}

export interface DiscountCode {
  id: string
  code: string
  percent_off: number
  starts_at: string | null
  ends_at: string | null
  active: boolean
  created_at: string
  targets: DiscountTarget[]
}

export interface DiscountCodeInput {
  code: string
  percent_off: number
  starts_at: string | null
  ends_at: string | null
  active: boolean
  courseIds: string[]
  serviceIds: string[]
}

export async function listDiscountCodes(): Promise<DiscountCode[]> {
  const { data, error } = await supabase
    .from('discount_codes')
    .select('id, code, percent_off, starts_at, ends_at, active, created_at, discount_code_targets(course_id, service_id)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: r.id as string,
      code: r.code as string,
      percent_off: r.percent_off as number,
      starts_at: (r.starts_at as string) ?? null,
      ends_at: (r.ends_at as string) ?? null,
      active: r.active as boolean,
      created_at: r.created_at as string,
      targets: (r.discount_code_targets as DiscountTarget[]) ?? [],
    }
  })
}

export async function createDiscountCode(values: DiscountCodeInput) {
  const { data, error } = await supabase
    .from('discount_codes')
    .insert({
      code: values.code.trim().toUpperCase(),
      percent_off: values.percent_off,
      starts_at: values.starts_at,
      ends_at: values.ends_at,
      active: values.active,
    })
    .select('id')
    .single()
  if (error) throw error

  const rows = [
    ...values.courseIds.map((id) => ({ discount_code_id: data.id, course_id: id, service_id: null })),
    ...values.serviceIds.map((id) => ({ discount_code_id: data.id, course_id: null, service_id: id })),
  ]
  if (rows.length > 0) {
    const { error: targetErr } = await supabase.from('discount_code_targets').insert(rows)
    if (targetErr) throw targetErr
  }
}

export async function updateDiscountCode(id: string, values: { active: boolean }) {
  const { error } = await supabase.from('discount_codes').update(values).eq('id', id)
  if (error) throw error
}

export async function deleteDiscountCode(id: string) {
  // Target rows cascade-delete with the code.
  const { error } = await supabase.from('discount_codes').delete().eq('id', id)
  if (error) throw error
}
