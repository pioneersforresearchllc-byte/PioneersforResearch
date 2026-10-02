import { supabase } from '@/lib/supabase'

export interface Testimonial {
  id: string
  user_id: string | null
  name: string
  subtitle: string | null
  stars: number
  body: string
  approved: boolean
  sort_order: number
  created_at: string
}

/** Approved reviews for the public homepage. Empty (not an error) before 0067. */
export async function listPublicTestimonials(): Promise<Testimonial[]> {
  const { data } = await supabase
    .from('testimonials')
    .select('*')
    .eq('approved', true)
    .order('sort_order')
    .order('created_at', { ascending: false })
  return (data as Testimonial[]) ?? []
}

/** Every review (pending + approved) for the owner. */
export async function listAllTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as Testimonial[]) ?? []
}

/** The signed-in customer's own reviews (to know if they already left one).
 * null when the table isn't there yet (before 0067), so callers can hide the prompt. */
export async function listMyTestimonials(userId: string): Promise<Testimonial[] | null> {
  const { data, error } = await supabase.from('testimonials').select('*').eq('user_id', userId)
  if (error) return null
  return (data as Testimonial[]) ?? []
}

/** Customer submits a review; the server keeps it hidden until approved. */
export async function submitTestimonial(input: { userId: string; name: string; subtitle: string; stars: number; body: string }) {
  const { error } = await supabase.from('testimonials').insert({
    user_id: input.userId,
    name: input.name.trim(),
    subtitle: input.subtitle.trim() || null,
    stars: input.stars,
    body: input.body.trim(),
  })
  if (error) throw error
}

export async function setTestimonialApproved(id: string, approved: boolean) {
  const { error } = await supabase.from('testimonials').update({ approved }).eq('id', id)
  if (error) throw error
}

export async function deleteTestimonial(id: string) {
  const { error } = await supabase.from('testimonials').delete().eq('id', id)
  if (error) throw error
}

/** Owner adds a review they received elsewhere (e.g. on WhatsApp, with the customer's consent). */
export async function createTestimonial(input: { name: string; subtitle: string; stars: number; body: string; approved: boolean }) {
  const { error } = await supabase.from('testimonials').insert({
    name: input.name.trim(),
    subtitle: input.subtitle.trim() || null,
    stars: input.stars,
    body: input.body.trim(),
    approved: input.approved,
  })
  if (error) throw error
}
