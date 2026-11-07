// SCFHS CPD activity features (migration 0091): per-activity assessment (quiz),
// learner evaluation/feedback, and a learner's own attendance view.
//
// Every reader tolerates migration 0091 not being applied yet — it returns
// null/empty rather than throwing, so the site stays deploy-safe.
import { supabase } from '@/lib/supabase'

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

// ── Quiz (assessment) ──────────────────────────────────────────────────────
export interface QuizQuestion {
  prompt: string
  options: string[]
  /** 0-based index of the correct option (owner-side only). */
  correct: number
}

export interface Quiz {
  passMark: number
  questions: QuizQuestion[]
}

/** The learner-facing shape returned by cpd_get_quiz — no correct answers. */
export interface LearnerQuiz {
  passMark: number
  questions: { prompt: string; options: string[] }[]
}

export interface QuizResult {
  score: number
  passed: boolean
  correct: number
  total: number
  pass_mark: number
}

export interface QuizAttempt {
  id: string
  course_id: string
  student_id: string
  score: number
  passed: boolean
  submitted_at: string
}

export const emptyQuiz: Quiz = { passMark: 60, questions: [] }

export function parseQuiz(raw: unknown): Quiz {
  if (!raw || typeof raw !== 'object') return emptyQuiz
  const r = raw as Record<string, unknown>
  const pm = num(r.passMark ?? r.pass_mark)
  return {
    passMark: pm >= 0 && pm <= 100 ? pm : 60,
    questions: Array.isArray(r.questions)
      ? r.questions.map((q) => {
          const o = (q ?? {}) as Record<string, unknown>
          return {
            prompt: str(o.prompt),
            options: Array.isArray(o.options) ? o.options.map(str) : ['', ''],
            correct: num(o.correct),
          }
        })
      : [],
  }
}

export function quizHasContent(q: Quiz): boolean {
  return q.questions.some((x) => x.prompt.trim() && x.options.some((o) => o.trim()))
}

/** Owner/teacher: read the full quiz (with answers) for editing. Null if none
 *  or pre-migration. */
export async function getCourseQuizAdmin(courseId: string): Promise<Quiz | null> {
  const { data, error } = await supabase
    .from('course_quizzes')
    .select('pass_mark, questions')
    .eq('course_id', courseId)
    .maybeSingle()
  if (error || !data) return null
  return parseQuiz({ passMark: data.pass_mark, questions: data.questions })
}

/** Owner/teacher: save (or clear) the quiz. */
export async function saveCourseQuiz(courseId: string, quiz: Quiz): Promise<void> {
  const clean = quiz.questions
    .map((q) => ({
      prompt: q.prompt.trim(),
      options: q.options.map((o) => o.trim()).filter(Boolean),
      correct: q.correct,
    }))
    .filter((q) => q.prompt && q.options.length >= 2)
    .map((q) => ({ ...q, correct: Math.min(Math.max(0, q.correct), q.options.length - 1) }))

  if (clean.length === 0) {
    const { error } = await supabase.from('course_quizzes').delete().eq('course_id', courseId)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('course_quizzes').upsert(
    {
      course_id: courseId,
      pass_mark: Math.min(Math.max(0, Math.round(quiz.passMark)), 100),
      questions: clean,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'course_id' },
  )
  if (error) throw error
}

/** Learner/preview: questions without the correct answers. Null if none. */
export async function getLearnerQuiz(courseId: string): Promise<LearnerQuiz | null> {
  const { data, error } = await supabase.rpc('cpd_get_quiz', { p_course_id: courseId })
  if (error || !data) return null
  const r = data as Record<string, unknown>
  return {
    passMark: num(r.pass_mark),
    questions: Array.isArray(r.questions)
      ? r.questions.map((q) => {
          const o = (q ?? {}) as Record<string, unknown>
          return { prompt: str(o.prompt), options: Array.isArray(o.options) ? o.options.map(str) : [] }
        })
      : [],
  }
}

/** Grade and record a submission (server-side). */
export async function submitQuiz(courseId: string, answers: (number | null)[]): Promise<QuizResult> {
  const { data, error } = await supabase.rpc('cpd_submit_quiz', { p_course_id: courseId, p_answers: answers })
  if (error) throw error
  return data as QuizResult
}

/** The learner's best (highest-scoring) attempt, or null. */
export async function getMyBestAttempt(courseId: string, studentId: string): Promise<QuizAttempt | null> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('id, course_id, student_id, score, passed, submitted_at')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .order('score', { ascending: false })
    .order('submitted_at', { ascending: false })
    .limit(1)
  if (error || !data || data.length === 0) return null
  return data[0] as QuizAttempt
}

// ── Evaluation / feedback ───────────────────────────────────────────────────
export interface SpeakerEval {
  name: string
  knowledge: number
  delivery: number
  comment: string
}

export interface CourseEvaluation {
  ratings: Record<string, number>
  speakers: SpeakerEval[]
  would_recommend: boolean | null
  comments: string
}

/** The five activity aspects rated 1–5 (keys used in `ratings`). */
export const EVAL_ASPECTS: { key: string; ar: string; en: string }[] = [
  { key: 'objectives_met', ar: 'تحقّقت الأهداف التعليمية المعلنة', en: 'The stated learning objectives were met' },
  { key: 'content_relevance', ar: 'المحتوى وثيق الصلة بممارستي المهنية', en: 'The content was relevant to my practice' },
  { key: 'methods', ar: 'أساليب التعلم كانت مناسبة وفعّالة', en: 'The learning methods were appropriate and effective' },
  { key: 'organization', ar: 'تنظيم النشاط والوقت والمنصّة', en: 'Organization, timing and the platform' },
  { key: 'overall', ar: 'رضاي العام عن النشاط', en: 'My overall satisfaction with the activity' },
]

export const emptyEvaluation: CourseEvaluation = { ratings: {}, speakers: [], would_recommend: null, comments: '' }

export async function getMyEvaluation(courseId: string, studentId: string): Promise<CourseEvaluation | null> {
  const { data, error } = await supabase
    .from('course_evaluations')
    .select('ratings, speakers, would_recommend, comments')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .maybeSingle()
  if (error || !data) return null
  return {
    ratings: (data.ratings as Record<string, number>) ?? {},
    speakers: Array.isArray(data.speakers)
      ? (data.speakers as unknown[]).map((s) => {
          const o = (s ?? {}) as Record<string, unknown>
          return { name: str(o.name), knowledge: num(o.knowledge), delivery: num(o.delivery), comment: str(o.comment) }
        })
      : [],
    would_recommend: typeof data.would_recommend === 'boolean' ? data.would_recommend : null,
    comments: str(data.comments),
  }
}

export async function submitEvaluation(courseId: string, studentId: string, ev: CourseEvaluation): Promise<void> {
  const { error } = await supabase.from('course_evaluations').upsert(
    {
      course_id: courseId,
      student_id: studentId,
      ratings: ev.ratings,
      speakers: ev.speakers.filter((s) => s.name.trim()),
      would_recommend: ev.would_recommend,
      comments: ev.comments.trim() || null,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: 'course_id,student_id' },
  )
  if (error) throw error
}

// ── Learner's own attendance ────────────────────────────────────────────────
export interface MyAttendanceRow {
  session_id: string
  title: string
  session_date: string
  session_time: string | null
  present: boolean | null
}

/** The learner's attendance across a course's sessions. Never throws. */
export async function getMyAttendance(courseId: string, studentId: string): Promise<MyAttendanceRow[]> {
  const { data: sessions, error } = await supabase
    .from('course_sessions')
    .select('id, title, session_date, session_time')
    .eq('course_id', courseId)
    .order('session_date')
  if (error || !sessions) return []
  const ids = sessions.map((s) => s.id as string)
  const marks = new Map<string, boolean>()
  if (ids.length > 0) {
    const { data: att } = await supabase
      .from('session_attendance')
      .select('session_id, present')
      .in('session_id', ids)
      .eq('student_id', studentId)
    for (const r of att ?? []) marks.set(r.session_id as string, r.present as boolean)
  }
  return sessions.map((s) => ({
    session_id: s.id as string,
    title: s.title as string,
    session_date: s.session_date as string,
    session_time: (s.session_time as string | null) ?? null,
    present: marks.has(s.id as string) ? marks.get(s.id as string)! : null,
  }))
}
