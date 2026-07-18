import { supabase } from '@/lib/supabase'

export interface ServicePackage {
  id: string
  service_id: string
  title: string
  title_en: string | null
  description: string | null
  description_en: string | null
  price_cents: number | null
  is_custom: boolean
  sort_order: number
}

export interface Service {
  id: string
  slug: string
  title: string
  title_en: string | null
  description: string
  description_en: string | null
  image_url: string | null
  active: boolean
  sort_order: number
  packages: ServicePackage[]
}

export async function listServices(): Promise<Service[]> {
  const { data: services, error } = await supabase
    .from('services')
    .select('*')
    .eq('active', true)
    .order('sort_order')
  if (error) throw error
  if (!services?.length) return []

  const { data: packages } = await supabase
    .from('service_packages')
    .select('*')
    .in(
      'service_id',
      services.map((s) => s.id),
    )
    .order('sort_order')

  return services.map((s) => ({
    ...s,
    packages: (packages ?? []).filter((p) => p.service_id === s.id),
  }))
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const { data: service, error } = await supabase.from('services').select('*').eq('slug', slug).maybeSingle()
  if (error || !service) return null
  const { data: packages } = await supabase
    .from('service_packages')
    .select('*')
    .eq('service_id', service.id)
    .order('sort_order')
  return { ...service, packages: packages ?? [] }
}

const REQUEST_BUCKET = 'service-request-files'

/**
 * Supabase Storage rejects object keys containing non-ASCII characters or
 * spaces — and real uploads routinely have both (e.g. an Arabic-dated phone
 * screenshot). So the stored key is a UUID plus a sanitised extension; the
 * human-readable name is never part of the path.
 */
function safeObjectKey(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const ext = dot > -1 ? fileName.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : ''
  return ext ? `${crypto.randomUUID()}.${ext}` : crypto.randomUUID()
}

export async function uploadRequestFile(file: File): Promise<string> {
  const path = safeObjectKey(file.name)
  const { error } = await supabase.storage.from(REQUEST_BUCKET).upload(path, file)
  if (error) throw error
  return path
}

/** Signed URL for the owner to open a requester's uploaded file. */
export async function signRequestFile(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(REQUEST_BUCKET).createSignedUrl(path, 600)
  return data?.signedUrl ?? null
}

export interface ServiceRequestInput {
  service_id: string
  package_id: string | null
  user_id: string | null
  full_name: string
  email: string
  phone: string
  subject: string
  purpose: string | null
  target_audience: string | null
  quantity: number | null
  language: string | null
  content_text: string | null
  content_file_url: string | null
  brand_colors: string | null
  reference_url: string | null
  reference_file_url: string | null
  delivery_date: string
  details: Record<string, string>
}

export async function submitServiceRequest(input: ServiceRequestInput) {
  const { error } = await supabase.from('service_requests').insert(input)
  if (error) throw error
}

export type RequestStatus = 'pending' | 'awaiting_payment' | 'paid' | 'in_progress' | 'done' | 'cancelled'

export interface ServiceRequestRow extends ServiceRequestInput {
  id: string
  status: RequestStatus
  final_price_cents: number | null
  assigned_teacher_id: string | null
  created_at: string
  serviceTitle: string
  packageTitle: string | null
  assigneeName: string | null
}

const REQUEST_SELECT =
  '*, service:services(title), package:service_packages(title), assignee:profiles!service_requests_assigned_teacher_id_fkey(name)'

function mapRequest(r: Record<string, unknown>): ServiceRequestRow {
  return {
    ...(r as unknown as ServiceRequestRow),
    serviceTitle: (r.service as { title: string } | null)?.title ?? '',
    packageTitle: (r.package as { title: string } | null)?.title ?? null,
    assigneeName: (r.assignee as { name: string } | null)?.name ?? null,
  }
}

export async function listServiceRequests(): Promise<ServiceRequestRow[]> {
  const { data, error } = await supabase
    .from('service_requests')
    .select(REQUEST_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapRequest)
}

/** Requests the owner has put on this teacher's plate. */
export async function listAssignedRequests(teacherId: string): Promise<ServiceRequestRow[]> {
  const { data, error } = await supabase
    .from('service_requests')
    .select(REQUEST_SELECT)
    .eq('assigned_teacher_id', teacherId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapRequest)
}

export async function assignRequestTeacher(id: string, teacherId: string | null) {
  const { error } = await supabase.from('service_requests').update({ assigned_teacher_id: teacherId }).eq('id', id)
  if (error) throw error
}

export async function updateRequestStatus(id: string, status: RequestStatus) {
  const { error } = await supabase.from('service_requests').update({ status }).eq('id', id)
  if (error) throw error
}

/**
 * Owner prices the request and asks the customer to pay. The price is set
 * here rather than taken from the package because the brief often changes
 * the real scope.
 */
export async function setRequestPrice(id: string, finalPriceCents: number) {
  const { error } = await supabase
    .from('service_requests')
    .update({ final_price_cents: finalPriceCents, status: 'awaiting_payment' })
    .eq('id', id)
  if (error) throw error

  // Fire-and-forget: the price is already saved, so a mail hiccup shouldn't
  // fail the owner's action — the customer still sees it in "My Requests".
  void supabase.functions.invoke('notify-payment-request', { body: { requestId: id } })
}

/** The signed-in user's own requests (RLS scopes this to user_id = auth.uid()). */
export async function listMyServiceRequests(userId: string): Promise<ServiceRequestRow[]> {
  const { data, error } = await supabase
    .from('service_requests')
    .select(REQUEST_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapRequest)
}

/** Starts Stripe Checkout for a priced request; returns the hosted page URL. */
export async function startServiceCheckout(requestId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-service-checkout', { body: { requestId } })
  if (error) {
    // On a non-2xx the SDK only gives a generic message; the useful detail is
    // in the response body it attached to error.context. Surface that instead.
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.text === 'function') {
      try {
        const raw = await ctx.text()
        const parsed = JSON.parse(raw) as { error?: string }
        throw new Error(parsed.error || raw || error.message)
      } catch (e) {
        if (e instanceof Error && e.message) throw e
      }
    }
    throw error
  }
  const result = data as { url?: string; error?: string }
  if (result.error || !result.url) throw new Error(result.error || 'checkout failed')
  return result.url
}

// ── Owner package/price control ──────────────────────────────────────────
export async function updatePackage(
  id: string,
  values: { title: string; description: string | null; price_cents: number | null; is_custom: boolean },
) {
  const { error } = await supabase.from('service_packages').update(values).eq('id', id)
  if (error) throw error
}

export async function listAllServicesForOwner(): Promise<Service[]> {
  const { data: services, error } = await supabase.from('services').select('*').order('sort_order')
  if (error) throw error
  if (!services?.length) return []
  const { data: packages } = await supabase
    .from('service_packages')
    .select('*')
    .in(
      'service_id',
      services.map((s) => s.id),
    )
    .order('sort_order')
  return services.map((s) => ({ ...s, packages: (packages ?? []).filter((p) => p.service_id === s.id) }))
}
