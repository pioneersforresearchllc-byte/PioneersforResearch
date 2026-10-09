import { supabase } from '@/lib/supabase'

export type ExpenseCategory = 'salaries' | 'teacher_fees' | 'rent' | 'marketing' | 'software' | 'government' | 'equipment' | 'other'
export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['salaries', 'teacher_fees', 'rent', 'marketing', 'software', 'government', 'equipment', 'other']

export interface Expense {
  id: string
  spent_on: string
  category: ExpenseCategory
  description: string
  amount_cents: number
  method: 'bank' | 'cash' | 'card'
  note: string | null
  created_at: string
}

export type RevenueSource = 'online' | 'invoice' | 'manual' | 'institution'

/** One money-in line, normalised from whichever table it came from. */
export interface RevenueLine {
  id: string
  date: string // YYYY-MM-DD
  source: RevenueSource
  description: string
  amount_cents: number
}

const day = (iso: string | null | undefined) => (iso ?? '').slice(0, 10)

/**
 * Every confirmed money-in, automatically: online card payments (completed),
 * student invoices marked paid, cash/bank payments recorded by hand, and
 * institution invoices marked paid. Each source fails soft (missing table → none).
 */
export async function listRevenue(): Promise<RevenueLine[]> {
  const [online, invoices, manual, inst] = await Promise.all([
    supabase.from('payments').select('id, amount_cents, created_at, status').eq('status', 'completed'),
    supabase.from('student_invoices').select('id, title, amount_cents, paid_at, created_at, status').eq('status', 'paid'),
    supabase.from('manual_payments').select('id, description, amount_cents, paid_at'),
    supabase.from('institution_invoices').select('id, amount_cents, created_at, status').eq('status', 'paid'),
  ])
  const lines: RevenueLine[] = []
  for (const r of online.data ?? []) lines.push({ id: `p-${r.id}`, date: day(r.created_at as string), source: 'online', description: 'Online payment', amount_cents: r.amount_cents as number })
  for (const r of invoices.data ?? [])
    lines.push({ id: `i-${r.id}`, date: day((r.paid_at as string) || (r.created_at as string)), source: 'invoice', description: r.title as string, amount_cents: r.amount_cents as number })
  for (const r of manual.data ?? []) lines.push({ id: `m-${r.id}`, date: day(r.paid_at as string), source: 'manual', description: r.description as string, amount_cents: r.amount_cents as number })
  for (const r of inst.data ?? []) lines.push({ id: `n-${r.id}`, date: day(r.created_at as string), source: 'institution', description: 'Institution invoice', amount_cents: r.amount_cents as number })
  return lines.sort((a, b) => b.date.localeCompare(a.date))
}

/** null when the expenses table isn't there yet (before 0070). */
export async function listExpenses(): Promise<Expense[] | null> {
  const { data, error } = await supabase.from('expenses').select('*').order('spent_on', { ascending: false })
  if (error) return null
  return (data ?? []) as Expense[]
}

export async function addExpense(input: Omit<Expense, 'id' | 'created_at'>) {
  const { error } = await supabase.from('expenses').insert(input)
  if (error) throw error
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}
