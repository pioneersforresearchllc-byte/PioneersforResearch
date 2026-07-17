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

export async function uploadRequestFile(file: File): Promise<string> {
  const path = `${crypto.randomUUID()}-${file.name}`
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

export interface ServiceRequestRow extends ServiceRequestInput {
  id: string
  status: 'pending' | 'in_progress' | 'done' | 'cancelled'
  created_at: string
  serviceTitle: string
  packageTitle: string | null
}

export async function listServiceRequests(): Promise<ServiceRequestRow[]> {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*, service:services(title), package:service_packages(title)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    ...(r as unknown as ServiceRequestRow),
    serviceTitle: (r.service as unknown as { title: string } | null)?.title ?? '',
    packageTitle: (r.package as unknown as { title: string } | null)?.title ?? null,
  }))
}

export async function updateRequestStatus(id: string, status: ServiceRequestRow['status']) {
  const { error } = await supabase.from('service_requests').update({ status }).eq('id', id)
  if (error) throw error
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
