import { supabase } from '@/lib/supabase'
import { triggerPush } from '@/lib/push'

export interface ServicePackage {
  id: string
  service_id: string
  title: string
  title_en: string | null
  description: string | null
  description_en: string | null
  price_cents: number | null
  original_price_cents: number | null
  is_custom: boolean
  sort_order: number
}

export type QuestionType = 'short' | 'long' | 'number' | 'select' | 'date' | 'file'

/** An owner-defined question on a service's request form (0056). */
export interface ServiceQuestion {
  id: string
  label: string
  label_en?: string | null
  type: QuestionType
  options?: string[]
  options_en?: string[]
  required?: boolean
}

/** A visitor's answer, denormalised onto the request so it's self-describing. */
export interface CustomAnswer {
  label: string
  label_en?: string | null
  type: QuestionType
  value: string
  fileName?: string | null
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
  hidden_fields: string[]
  // Direct price used when the service has no packages (nullable — 0055).
  price_cents: number | null
  original_price_cents: number | null
  // Owner-defined custom request questions (0056). Null/empty → legacy form.
  questions: ServiceQuestion[] | null
  packages: ServicePackage[]
}

/** Optional request-form questions the owner may show/hide per service. */
export const TOGGLEABLE_SERVICE_FIELDS = [
  'purpose',
  'audience',
  'quantity',
  'language',
  'brand_colors',
  'reference',
  'software',
] as const
export type ToggleableField = (typeof TOGGLEABLE_SERVICE_FIELDS)[number]

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
  custom_answers?: CustomAnswer[] | null
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
  student_unseen: boolean
  created_at: string
  serviceTitle: string
  packageTitle: string | null
  packagePriceCents: number | null
  packageIsCustom: boolean
  assigneeName: string | null
}

/**
 * A requester may delete their own request only when nothing is owed on it:
 * unpaid stages, or an already-delivered one. A paid request that hasn't been
 * delivered yet ('paid'/'in_progress') can't be removed. Mirrors the RLS
 * policy in migration 0024 so the UI hides the button the DB would reject.
 */
export function canDeleteRequest(status: RequestStatus): boolean {
  return status === 'pending' || status === 'awaiting_payment' || status === 'cancelled' || status === 'done'
}

/**
 * True once the customer has paid — 'paid' is only ever set by the Stripe
 * webhook, and 'in_progress'/'done' come after it. In this phase the owner
 * works the request forward (paid → in progress → done) and can't revert it
 * to a pre-payment stage.
 */
export function isPaidPhase(status: RequestStatus): boolean {
  return status === 'paid' || status === 'in_progress' || status === 'done'
}

const REQUEST_SELECT =
  '*, service:services(title), package:service_packages(title, price_cents, is_custom), assignee:profiles!service_requests_assigned_teacher_id_fkey(name)'

function mapRequest(r: Record<string, unknown>): ServiceRequestRow {
  const pkg = r.package as { title: string; price_cents: number | null; is_custom: boolean } | null
  return {
    ...(r as unknown as ServiceRequestRow),
    serviceTitle: (r.service as { title: string } | null)?.title ?? '',
    packageTitle: pkg?.title ?? null,
    packagePriceCents: pkg?.price_cents ?? null,
    packageIsCustom: pkg?.is_custom ?? false,
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
  triggerPush('service_request', id)
}

/** Emails the requester that their work is complete. Called when marked done. */
export async function notifyRequestDone(id: string) {
  await supabase.functions.invoke('notify-request-done', { body: { requestId: id } })
  triggerPush('service_request', id)
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
  triggerPush('service_request', id)
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

/** Owner deletes a request (RLS: owner-only). Callers gate on canDeleteRequest. */
export async function deleteServiceRequest(id: string) {
  const { error } = await supabase.from('service_requests').delete().eq('id', id)
  if (error) throw error
}

/** Count of the caller's requests with an unseen development (for the badge). */
export async function countMyUnseenRequests(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('service_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('student_unseen', true)
  if (error) return 0
  return count ?? 0
}

/** Clears the unseen flag on all the caller's requests (they opened the list). */
export async function markMyRequestsSeen() {
  await supabase.rpc('mark_service_requests_seen')
}

/** Starts Stripe Checkout for a priced request; returns the hosted page URL. */
export async function startServiceCheckout(requestId: string, code?: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-service-checkout', {
    body: { requestId, code: code?.trim() || undefined },
  })
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
  values: {
    title: string
    description: string | null
    price_cents: number | null
    original_price_cents: number | null
    is_custom: boolean
  },
) {
  const { error } = await supabase.from('service_packages').update(values).eq('id', id)
  if (error) throw error
}

/** Owner-only: delete a package from a service. Existing requests keep working —
 * their package_id is set to null (on delete set null). */
export async function deletePackage(id: string) {
  const { error } = await supabase.from('service_packages').delete().eq('id', id)
  if (error) throw error
}

/** Owner-only: edit a service's name + description (Arabic + English) and its
 * direct price (used when it has no packages). RLS (services_write_owner)
 * restricts this to a verified owner. */
export async function updateService(
  id: string,
  values: {
    title: string
    title_en: string | null
    description: string
    description_en: string | null
    price_cents?: number | null
    original_price_cents?: number | null
    questions?: ServiceQuestion[] | null
    image_url?: string | null
  },
) {
  const { error } = await supabase.from('services').update(values).eq('id', id)
  if (error) throw error
}

/** Owner-only: upload a service card image (reuses the public images bucket). */
export async function uploadServiceImage(file: File): Promise<string> {
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `service-${crypto.randomUUID()}-${safe}`
  const { error } = await supabase.storage.from('course-images').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('course-images').getPublicUrl(path)
  return data.publicUrl
}

/** Sensible default request questions every NEW service starts with — tuned
 * for research/training services (the owner can edit or remove them). */
export const DEFAULT_SERVICE_QUESTIONS: ServiceQuestion[] = [
  {
    id: 'q_topic',
    label: 'اشرح فكرتك أو طلبك بالتفصيل',
    label_en: 'Describe your idea or request in detail',
    type: 'long',
    required: true,
  },
  {
    id: 'q_field',
    label: 'التخصص أو المجال البحثي',
    label_en: 'Field / research area',
    type: 'short',
    required: false,
  },
  {
    id: 'q_stage',
    label: 'المرحلة الدراسية',
    label_en: 'Academic stage',
    type: 'select',
    options: ['بكالوريوس', 'ماجستير', 'دكتوراه', 'باحث مستقل', 'أخرى'],
    options_en: ['Bachelor', 'Master', 'PhD', 'Independent researcher', 'Other'],
    required: false,
  },
  {
    id: 'q_deadline',
    label: 'الموعد المطلوب لإنجاز الخدمة',
    label_en: 'Preferred completion date',
    type: 'date',
    required: false,
  },
  {
    id: 'q_file',
    label: 'أرفق ملفًا داعمًا (إن وُجد)',
    label_en: 'Attach a supporting file (optional)',
    type: 'file',
    required: false,
  },
]

/** A URL-safe slug from a title, plus a short random suffix so two services
 * with similar names never collide on the unique slug column. */
function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const suffix = Math.random().toString(36).slice(2, 7)
  return base ? `${base}-${suffix}` : `service-${suffix}`
}

/** Owner-only: create a new service. Starts active with no packages (it can be
 * sold via its direct price, or the owner adds packages after). */
export async function createService(values: {
  title: string
  title_en: string | null
  description: string
  description_en: string | null
}): Promise<string> {
  // Place the new one at the end.
  const { data: last } = await supabase.from('services').select('sort_order').order('sort_order', { ascending: false }).limit(1)
  const nextOrder = ((last?.[0]?.sort_order as number | undefined) ?? 0) + 1
  const { data, error } = await supabase
    .from('services')
    .insert({
      slug: slugify(values.title_en || values.title),
      title: values.title,
      title_en: values.title_en,
      description: values.description,
      description_en: values.description_en,
      active: true,
      sort_order: nextOrder,
      hidden_fields: [],
      questions: DEFAULT_SERVICE_QUESTIONS,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

/** Owner-only: delete a service (its packages cascade; existing requests keep
 * their copy — service_id is set null on delete). */
export async function deleteService(id: string) {
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) throw error
}

/** Owner-only: add a package to a service. */
export async function createPackage(serviceId: string): Promise<void> {
  const { data: last } = await supabase
    .from('service_packages')
    .select('sort_order')
    .eq('service_id', serviceId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = ((last?.[0]?.sort_order as number | undefined) ?? 0) + 1
  const { error } = await supabase.from('service_packages').insert({
    service_id: serviceId,
    title: 'باقة جديدة',
    price_cents: null,
    is_custom: false,
    sort_order: nextOrder,
  })
  if (error) throw error
}

/** Owner-only: set which optional questions are hidden on a service's form. */
export async function updateServiceHiddenFields(id: string, hidden_fields: string[]) {
  const { error } = await supabase.from('services').update({ hidden_fields }).eq('id', id)
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
