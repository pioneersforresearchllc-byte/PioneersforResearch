import { supabase } from '@/lib/supabase'

export type InvoiceStatus = 'unpaid' | 'submitted' | 'paid' | 'cancelled'

export interface StudentInvoice {
  id: string
  user_id: string
  title: string
  description: string | null
  amount_cents: number
  status: InvoiceStatus
  receipt_path: string | null
  receipt_submitted_at: string | null
  paid_at: string | null
  note: string | null
  created_at: string
}

const COLS =
  'id, user_id, title, description, amount_cents, status, receipt_path, receipt_submitted_at, paid_at, note, created_at'

/** The billed student's own invoices, newest first. */
export async function listMyInvoices(): Promise<StudentInvoice[]> {
  const { data, error } = await supabase.from('student_invoices').select(COLS).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as StudentInvoice[]
}

/** All invoices (owner view). */
export async function listAllInvoices(): Promise<StudentInvoice[]> {
  const { data, error } = await supabase.from('student_invoices').select(COLS).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as StudentInvoice[]
}

export interface StudentOption {
  id: string
  name: string
  username: string
}

/** Active student accounts, for the invoice recipient picker. */
export async function listStudents(): Promise<StudentOption[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, username')
    .eq('role', 'student')
    .eq('status', 'active')
    .order('name')
  if (error) throw error
  return (data ?? []) as StudentOption[]
}

/** Emails the invoice (as a formatted invoice) to the student from the company
 * address. Returns whether it was actually sent — the function replies 200 with
 * { sent:false } when SMTP isn't configured, so we must read the body, not just
 * the transport error. Never throws; the invoice exists regardless. */
export async function sendInvoiceEmail(invoiceId: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('send-invoice-email', { body: { invoiceId } })
  if (error) return false
  return !!(data as { sent?: boolean } | null)?.sent
}

/** Owner issues an invoice to a student (found by email or username). */
export async function createInvoice(identifier: string, title: string, description: string, amountCents: number): Promise<string> {
  const { data, error } = await supabase.rpc('admin_create_invoice', {
    p_identifier: identifier.trim(),
    p_title: title.trim(),
    p_description: description,
    p_amount_cents: amountCents,
  })
  if (error) throw error
  return data as string
}

/** Student uploads a transfer receipt, then marks the invoice submitted. */
export async function submitReceipt(invoiceId: string, file: File): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) throw new Error('not signed in')
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${uid}/${invoiceId}-${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage.from('payment-receipts').upload(path, file, { upsert: true })
  if (upErr) throw upErr
  const { error } = await supabase.rpc('submit_invoice_receipt', { p_invoice: invoiceId, p_path: path })
  if (error) throw error
}

export async function markInvoicePaid(invoiceId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_mark_invoice_paid', { p_invoice: invoiceId })
  if (error) throw error
}

export async function cancelInvoice(invoiceId: string): Promise<void> {
  const { error } = await supabase.from('student_invoices').update({ status: 'cancelled' }).eq('id', invoiceId)
  if (error) throw error
}

/** A short-lived signed URL to view a private receipt (owner). */
export async function receiptUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('payment-receipts').createSignedUrl(path, 60 * 10)
  if (error) return null
  return data.signedUrl
}
