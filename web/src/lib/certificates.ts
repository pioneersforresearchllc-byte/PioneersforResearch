import { supabase } from '@/lib/supabase'

export interface CertificateTemplate {
  id: string
  title: string
  image_url: string
  name_x: number
  name_y: number
  course_x: number
  course_y: number
}

export async function uploadTemplateImage(file: File): Promise<string> {
  const path = `${crypto.randomUUID()}-${file.name}`
  const { error } = await supabase.storage.from('certificate-templates').upload(path, file)
  if (error) throw error
  const { data } = await supabase.storage.from('certificate-templates').createSignedUrl(path, 60 * 60 * 24 * 365)
  if (!data) throw new Error('تعذر توليد رابط الصورة')
  return data.signedUrl
}

export async function createTemplate(title: string, imageUrl: string): Promise<string> {
  const { data, error } = await supabase
    .from('certificate_templates')
    .insert({ title, image_url: imageUrl })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function listTemplates(): Promise<CertificateTemplate[]> {
  const { data, error } = await supabase.from('certificate_templates').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateTemplatePosition(
  id: string,
  pos: { name_x: number; name_y: number; course_x: number; course_y: number },
) {
  const { error } = await supabase.from('certificate_templates').update(pos).eq('id', id)
  if (error) throw error
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase.from('certificate_templates').delete().eq('id', id)
  if (error) throw error
}

export async function listCourseTemplateIds(courseId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('course_certificate_templates')
    .select('template_id')
    .eq('course_id', courseId)
  if (error) throw error
  return (data ?? []).map((r) => r.template_id)
}

export async function setCourseTemplates(courseId: string, templateIds: string[]) {
  const { data: existing } = await supabase
    .from('course_certificate_templates')
    .select('template_id')
    .eq('course_id', courseId)
  const existingIds = new Set((existing ?? []).map((r) => r.template_id))
  const nextIds = new Set(templateIds)

  const toAdd = templateIds.filter((id) => !existingIds.has(id))
  const toRemove = [...existingIds].filter((id) => !nextIds.has(id))

  if (toAdd.length > 0) {
    await supabase
      .from('course_certificate_templates')
      .insert(toAdd.map((template_id) => ({ course_id: courseId, template_id })))
  }
  if (toRemove.length > 0) {
    await supabase.from('course_certificate_templates').delete().eq('course_id', courseId).in('template_id', toRemove)
  }
}

// Composites the template image with the student's name and the course
// title baked in at the template's configured position, then returns a PNG
// blob ready to upload — done client-side via canvas so no server-side
// image processing is needed.
async function compositeCertificate(
  template: CertificateTemplate,
  studentName: string,
  courseTitle: string,
): Promise<Blob> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('تعذر تحميل صورة القالب'))
    img.src = template.image_url
  })

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('تعذر إنشاء لوحة الرسم')

  ctx.drawImage(img, 0, 0)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#0b1f3a'

  const nameFontSize = Math.round(canvas.width * 0.045)
  ctx.font = `700 ${nameFontSize}px "El Messiri", serif`
  ctx.fillText(studentName, (template.name_x / 100) * canvas.width, (template.name_y / 100) * canvas.height)

  const courseFontSize = Math.round(canvas.width * 0.024)
  ctx.font = `400 ${courseFontSize}px "IBM Plex Sans Arabic", sans-serif`
  ctx.fillText(courseTitle, (template.course_x / 100) * canvas.width, (template.course_y / 100) * canvas.height)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('تعذر تحويل الشهادة لصورة'))), 'image/png')
  })
}

export async function issueCertificatesForCourse(courseId: string, courseTitle: string): Promise<number> {
  const [{ data: enrollments }, templateIds] = await Promise.all([
    supabase.from('enrollments').select('student_id, student:profiles(name)').eq('course_id', courseId),
    listCourseTemplateIds(courseId),
  ])
  if (!enrollments?.length || templateIds.length === 0) return 0

  const templates = await listTemplates()
  const templatesById = new Map(templates.map((t) => [t.id, t]))

  const { data: existing } = await supabase
    .from('certificate_issuances')
    .select('student_id, template_id')
    .eq('course_id', courseId)
  const existingKeys = new Set((existing ?? []).map((e) => `${e.student_id}:${e.template_id}`))

  let issuedCount = 0
  for (const enrollment of enrollments) {
    const studentName = (enrollment.student as unknown as { name: string } | null)?.name ?? ''
    for (const templateId of templateIds) {
      if (existingKeys.has(`${enrollment.student_id}:${templateId}`)) continue
      const template = templatesById.get(templateId)
      if (!template) continue

      const blob = await compositeCertificate(template, studentName, courseTitle)
      const path = `${enrollment.student_id}/${courseId}-${templateId}.png`
      const { error: uploadErr } = await supabase.storage.from('certificate-issuances').upload(path, blob, {
        upsert: true,
      })
      if (uploadErr) throw uploadErr
      const { data: signed } = await supabase.storage.from('certificate-issuances').createSignedUrl(path, 60 * 60 * 24 * 365)

      const { error: insertErr } = await supabase.from('certificate_issuances').insert({
        course_id: courseId,
        student_id: enrollment.student_id,
        template_id: templateId,
        image_url: signed?.signedUrl ?? null,
      })
      if (insertErr) throw insertErr
      issuedCount += 1
    }
  }
  return issuedCount
}

export interface IssuedCertificate {
  id: string
  course_title: string
  template_title: string
  image_url: string | null
  issued_at: string
}

export async function listMyCertificates(studentId: string): Promise<IssuedCertificate[]> {
  const { data, error } = await supabase
    .from('certificate_issuances')
    .select('id, image_url, issued_at, course:courses(title), template:certificate_templates(title)')
    .eq('student_id', studentId)
    .order('issued_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    image_url: r.image_url,
    issued_at: r.issued_at,
    course_title: (r.course as unknown as { title: string } | null)?.title ?? '',
    template_title: (r.template as unknown as { title: string } | null)?.title ?? '',
  }))
}
