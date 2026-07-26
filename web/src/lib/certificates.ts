import QRCode from 'qrcode'
import { supabase } from '@/lib/supabase'

/** Public verification URL a certificate's QR code points to. */
export function certificateVerifyUrl(issuanceId: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://pioneersresearch.com'
  return `${base}/verify/${issuanceId}`
}

export interface CertificateTemplate {
  id: string
  title: string
  image_url: string
  name_x: number
  name_y: number
  course_x: number
  course_y: number
  qr_x: number
  qr_y: number
  date_x: number
  date_y: number
}

export interface TemplatePositions {
  name_x: number
  name_y: number
  course_x: number
  course_y: number
  qr_x: number
  qr_y: number
  date_x: number
  date_y: number
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

export async function updateTemplatePosition(id: string, pos: TemplatePositions) {
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
async function loadImage(src: string, errMsg: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(errMsg))
    img.src = src
  })
  return img
}

async function compositeCertificate(
  template: CertificateTemplate,
  studentName: string,
  courseTitle: string,
  verifyUrl: string,
  dateText: string,
  certNumber: string,
): Promise<Blob> {
  const img = await loadImage(template.image_url, 'تعذر تحميل صورة القالب')

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

  // Issue date at the admin-chosen position.
  const dateFontSize = Math.round(canvas.width * 0.018)
  ctx.font = `500 ${dateFontSize}px "IBM Plex Sans Arabic", sans-serif`
  ctx.fillText(dateText, (template.date_x / 100) * canvas.width, (template.date_y / 100) * canvas.height)

  // Verification QR — generated locally (no network, so the canvas stays
  // untainted). (qr_x, qr_y) is the CENTRE, matching the draggable dot.
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 640,
      color: { dark: '#0b1f3a', light: '#ffffff' },
    })
    const qrImg = await loadImage(qrDataUrl, 'تعذر توليد رمز التحقق')
    const qrSize = Math.round(canvas.width * 0.13)
    const cx = (template.qr_x / 100) * canvas.width
    const cy = (template.qr_y / 100) * canvas.height
    const boxPad = Math.round(qrSize * 0.08)
    const box = qrSize + boxPad * 2
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(cx - box / 2, cy - box / 2, box, box)
    ctx.drawImage(qrImg, cx - qrSize / 2, cy - qrSize / 2, qrSize, qrSize)
    // Readable serial under the QR.
    if (certNumber) {
      const codeFont = Math.round(canvas.width * 0.013)
      ctx.font = `600 ${codeFont}px "IBM Plex Sans Arabic", sans-serif`
      ctx.fillStyle = '#0b1f3a'
      ctx.fillText(certNumber, cx, cy + box / 2 + codeFont)
    }
  } catch {
    // If QR generation fails, still issue the certificate without it.
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('تعذر تحويل الشهادة لصورة'))), 'image/png')
  })
}

/**
 * Issues certificates for a course. By default only students who don't yet
 * have one get issued. Pass `{ reissue: true }` to regenerate EVERY student's
 * certificate — used to "re-send" after a student fixes their certificate name;
 * the existing verification id (and thus the QR link) is preserved so old scans
 * keep working. The printed name prefers the student's `certificate_name`,
 * falling back to their account name.
 */
export async function issueCertificatesForCourse(
  courseId: string,
  courseTitle: string,
  opts: { reissue?: boolean } = {},
): Promise<number> {
  const [{ data: enrollments }, templateIds] = await Promise.all([
    supabase.from('enrollments').select('student_id, student:profiles(name, certificate_name)').eq('course_id', courseId),
    listCourseTemplateIds(courseId),
  ])
  if (!enrollments?.length || templateIds.length === 0) return 0

  const templates = await listTemplates()
  const templatesById = new Map(templates.map((t) => [t.id, t]))

  const { data: existing } = await supabase
    .from('certificate_issuances')
    .select('id, student_id, template_id, cert_number')
    .eq('course_id', courseId)
  const existingByKey = new Map(
    (existing ?? []).map((e) => [
      `${e.student_id}:${e.template_id}`,
      { id: e.id as string, certNumber: (e.cert_number as string | null) ?? '' },
    ]),
  )

  let issuedCount = 0
  for (const enrollment of enrollments) {
    const student = enrollment.student as unknown as { name: string; certificate_name: string | null } | null
    const printedName = (student?.certificate_name?.trim() || student?.name || '').trim()
    for (const templateId of templateIds) {
      const key = `${enrollment.student_id}:${templateId}`
      const existingRec = existingByKey.get(key)
      if (existingRec && !opts.reissue) continue
      const template = templatesById.get(templateId)
      if (!template) continue

      // Reuse the existing id + serial on re-issue so the QR link and printed
      // certificate number stay stable; mint fresh ones for new certificates.
      const issuanceId = existingRec?.id ?? crypto.randomUUID()
      let certNumber = existingRec?.certNumber ?? ''
      if (!certNumber) {
        const { data: num } = await supabase.rpc('next_certificate_number')
        certNumber = (num as string | null) ?? ''
      }
      const dateText = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
      const blob = await compositeCertificate(
        template,
        printedName,
        courseTitle,
        certificateVerifyUrl(issuanceId),
        dateText,
        certNumber,
      )
      const path = `${enrollment.student_id}/${courseId}-${templateId}.png`
      const { error: uploadErr } = await supabase.storage.from('certificate-issuances').upload(path, blob, {
        upsert: true,
      })
      if (uploadErr) throw uploadErr
      const { data: signed } = await supabase.storage.from('certificate-issuances').createSignedUrl(path, 60 * 60 * 24 * 365)

      if (existingRec) {
        const { error: updErr } = await supabase
          .from('certificate_issuances')
          .update({ image_url: signed?.signedUrl ?? null, cert_number: certNumber })
          .eq('id', existingRec.id)
        if (updErr) throw updErr
      } else {
        const { error: insertErr } = await supabase.from('certificate_issuances').insert({
          id: issuanceId,
          course_id: courseId,
          student_id: enrollment.student_id,
          template_id: templateId,
          cert_number: certNumber,
          image_url: signed?.signedUrl ?? null,
        })
        if (insertErr) throw insertErr
      }
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

export interface CertificateVerification {
  valid: boolean
  student_name: string
  course_title: string
  template_title: string
  cert_number: string
  issued_at: string
}

/** Public authenticity check for a scanned certificate QR (no login needed). */
export async function verifyCertificate(id: string): Promise<CertificateVerification | null> {
  const { data, error } = await supabase.rpc('verify_certificate', { p_id: id })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row || !row.valid) return null
  return row as CertificateVerification
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
