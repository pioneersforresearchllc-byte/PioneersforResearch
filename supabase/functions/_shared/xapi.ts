// Builders for NELC xAPI statements (the National eLearning Center learning
// journey). Each function returns a statement object in the exact shape the
// NELC LRS verification expects. The learner is identified by national ID in
// `actor.name`; the course object id is a stable IRI under our domain.
//
// Verb coverage for the real platform lifecycle:
//   enrol        -> registered (+ initialized)
//   progress     -> progressed
//   completion   -> completed (course)
//   rating       -> rated
//   certificate  -> earned
// (Content-level verbs — watched / completed-lesson / attempted-quiz — can be
//  added later once the platform tracks lesson/video/quiz events.)

export const PLATFORM_URL = 'https://www.pioneersresearch.com'
export const PLATFORM_NAME = {
  'ar-SA': 'الرواد الاستشارية للبحوث الصحية',
  'en-US': 'Pioneers Health Research',
}
const LANG = 'ar-SA'

export type Learner = { nationalId: string; email: string; name?: string }
export type Course = {
  id: string
  title: string
  description?: string
  durationLabel?: string
  durationIso?: string // e.g. PT30H00M00S
}

export function courseIri(course: Course): string {
  return `${PLATFORM_URL}/course/${course.id}`
}

function actor(l: Learner) {
  const email = l.email && l.email.includes('@') ? l.email : `${l.nationalId}@users.pioneersresearch.com`
  return { mbox: `mailto:${email}`, name: l.nationalId, objectType: 'Agent' }
}

function courseObject(course: Course, withDescription = false) {
  const definition: Record<string, unknown> = {
    name: { 'en-US': course.title },
    type: 'https://w3id.org/xapi/cmi5/activitytype/course',
  }
  if (withDescription && course.description) {
    definition.description = { 'en-US': course.description }
  }
  return { id: courseIri(course), definition, objectType: 'Activity' }
}

function courseParent(course: Course) {
  return { contextActivities: { parent: [courseObject(course)] } }
}

const nelcPlatformExt = { 'https://nelc.gov.sa/extensions/platform': { name: PLATFORM_NAME } }

function baseContext(extra: Record<string, unknown> = {}) {
  return { platform: PLATFORM_URL, language: LANG, ...extra }
}

function nowIso(ts?: string): string {
  return ts || new Date().toISOString()
}

// 1) registered — on enrolment
export function buildRegistered(l: Learner, course: Course, ts?: string) {
  return {
    actor: actor(l),
    verb: { id: 'http://adlnet.gov/expapi/verbs/registered', display: { 'en-US': 'registered' } },
    object: courseObject(course, true),
    context: baseContext({
      extensions: {
        'https://nelc.gov.sa/extensions/duration': course.durationIso || 'PT01H00M00S',
        'https://nelc.gov.sa/extensions/lms_url': PLATFORM_URL,
        'https://nelc.gov.sa/extensions/program_url': courseIri(course),
        ...nelcPlatformExt,
      },
    }),
    timestamp: nowIso(ts),
  }
}

// 2) initialized — learner opened the course for the first time
export function buildInitialized(l: Learner, course: Course, ts?: string) {
  return {
    actor: actor(l),
    verb: { id: 'http://adlnet.gov/expapi/verbs/initialized', display: { 'en-US': 'initialized' } },
    object: courseObject(course),
    context: baseContext({ extensions: { ...nelcPlatformExt } }),
    timestamp: nowIso(ts),
  }
}

// 3) progressed — progress is 0..100
export function buildProgressed(l: Learner, course: Course, progress: number, ts?: string) {
  const scaled = Math.max(0, Math.min(1, progress / 100))
  return {
    actor: actor(l),
    verb: { id: 'http://adlnet.gov/expapi/verbs/progressed', display: { 'en-US': 'progressed' } },
    object: courseObject(course),
    context: baseContext(),
    result: { score: { scaled: Number(scaled.toFixed(2)) }, completion: progress >= 100 },
    timestamp: nowIso(ts),
  }
}

// 4) completed — the whole course
export function buildCompleted(l: Learner, course: Course, ts?: string) {
  return {
    actor: actor(l),
    verb: { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'en-US': 'completed' } },
    object: courseObject(course),
    context: baseContext(),
    result: { completion: true },
    timestamp: nowIso(ts),
  }
}

// 5) rated — stars are 1..5
export function buildRated(l: Learner, course: Course, stars: number, response?: string, ts?: string) {
  const s = Math.max(1, Math.min(5, Math.round(stars)))
  const result: Record<string, unknown> = { score: { scaled: Number((s / 5).toFixed(2)), raw: s, min: 0, max: 5 } }
  if (response) result.response = response
  return {
    actor: actor(l),
    verb: { id: 'http://id.tincanapi.com/verb/rated', display: { 'en-US': 'rated' } },
    object: courseObject(course),
    context: baseContext(),
    result,
    timestamp: nowIso(ts),
  }
}

// 6) earned — a certificate was issued
export function buildEarned(
  l: Learner,
  course: Course,
  certificate: { id: string; name?: string; verifyUrl?: string },
  ts?: string,
) {
  const certIri = `${courseIri(course)}/certificate/${certificate.id}`
  const extensions: Record<string, unknown> = { ...nelcPlatformExt }
  if (certificate.verifyUrl) {
    extensions['http://id.tincanapi.com/extension/jws-certificate-location'] = certificate.verifyUrl
  }
  return {
    actor: actor(l),
    verb: { id: 'http://id.tincanapi.com/verb/earned', display: { 'en-US': 'earned' } },
    object: {
      id: certIri,
      definition: {
        name: { 'en-US': certificate.name || `${course.title} Certificate` },
        type: 'https://www.opigno.org/en/tincan_registry/activity_type/certificate',
      },
      objectType: 'Activity',
    },
    context: baseContext({ extensions, ...courseParent(course) }),
    timestamp: nowIso(ts),
  }
}
