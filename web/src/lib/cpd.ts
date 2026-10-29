import { supabase } from '@/lib/supabase'
import { saveSiteContent, type ContentMap } from '@/lib/content'

// ── Per-course CPD details (courses.cpd, migration 0090) ───────────────────
// What SCFHS expects on every CPD activity page. Free text, Arabic-first;
// list fields hold one item per line.
export interface CpdSpeaker {
  name: string
  credentials: string
  /** Financial relationships with commercial interests (name, company, nature). */
  disclosure: string
}

export interface CourseCpd {
  audience: string
  objectives: string
  outcomes: string
  methods: string
  assessment: string
  hours: string
  accreditationNo: string
  /** Commercial sponsors; empty = no commercial sponsorship. */
  sponsorship: string
  speakers: CpdSpeaker[]
}

export const NO_RELATIONSHIP_AR = 'لا توجد لديّ أي علاقة مالية ذات صلة بأي جهة تجارية.'

export const emptyCpd: CourseCpd = {
  audience: '',
  objectives: '',
  outcomes: '',
  methods: '',
  assessment: '',
  hours: '',
  accreditationNo: '',
  sponsorship: '',
  speakers: [],
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

export function parseCpd(raw: unknown): CourseCpd {
  if (!raw || typeof raw !== 'object') return emptyCpd
  const r = raw as Record<string, unknown>
  return {
    audience: str(r.audience),
    objectives: str(r.objectives),
    outcomes: str(r.outcomes),
    methods: str(r.methods),
    assessment: str(r.assessment),
    hours: str(r.hours),
    accreditationNo: str(r.accreditationNo),
    sponsorship: str(r.sponsorship),
    speakers: Array.isArray(r.speakers)
      ? r.speakers.map((s) => {
          const o = (s ?? {}) as Record<string, unknown>
          return { name: str(o.name), credentials: str(o.credentials), disclosure: str(o.disclosure) }
        })
      : [],
  }
}

/** True when the owner has filled in any CPD detail for the course. */
export function hasCpd(c: CourseCpd): boolean {
  return (
    [c.audience, c.objectives, c.outcomes, c.methods, c.assessment, c.hours].some((v) => v.trim()) ||
    c.speakers.some((s) => s.name.trim())
  )
}

export const lines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[•\-–*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)

function cleanCpd(c: CourseCpd): CourseCpd | null {
  const trimmed: CourseCpd = {
    audience: c.audience.trim(),
    objectives: c.objectives.trim(),
    outcomes: c.outcomes.trim(),
    methods: c.methods.trim(),
    assessment: c.assessment.trim(),
    hours: c.hours.trim(),
    accreditationNo: c.accreditationNo.trim(),
    sponsorship: c.sponsorship.trim(),
    speakers: c.speakers
      .map((s) => ({ name: s.name.trim(), credentials: s.credentials.trim(), disclosure: s.disclosure.trim() }))
      .filter((s) => s.name),
  }
  return hasCpd(trimmed) || trimmed.accreditationNo || trimmed.sponsorship ? trimmed : null
}

// Saved apart from the main course update so courses keep saving before
// migration 0090 adds the column: nothing is written while the form is empty.
export async function setCourseCpd(courseId: string, cpd: CourseCpd, previous: unknown) {
  const value = cleanCpd(cpd)
  if (!value && !previous) return
  const { error } = await supabase.from('courses').update({ cpd: value }).eq('id', courseId)
  if (error) throw error
}

// ── CPD team shown on /cpd (site_content key, owner-editable) ──────────────
export interface CpdPerson {
  name: string
  title: string
}

export interface CpdTeam {
  manager: CpdPerson & { scfhs: string }
  coordinator: CpdPerson
  committee: (CpdPerson & { role: string })[]
}

export const CPD_TEAM_KEY = 'cpd.team'

export const emptyCpdTeam: CpdTeam = {
  manager: { name: '', title: '', scfhs: '' },
  coordinator: { name: '', title: '' },
  committee: [],
}

export function parseCpdTeam(content: ContentMap | undefined): CpdTeam {
  try {
    const raw = JSON.parse(content?.[CPD_TEAM_KEY]?.en || 'null') as Partial<CpdTeam> | null
    if (!raw) return emptyCpdTeam
    return {
      manager: { name: str(raw.manager?.name), title: str(raw.manager?.title), scfhs: str(raw.manager?.scfhs) },
      coordinator: { name: str(raw.coordinator?.name), title: str(raw.coordinator?.title) },
      committee: Array.isArray(raw.committee)
        ? raw.committee.map((m) => ({ name: str(m?.name), title: str(m?.title), role: str(m?.role) }))
        : [],
    }
  } catch {
    return emptyCpdTeam
  }
}

export async function saveCpdTeam(team: CpdTeam) {
  const clean: CpdTeam = {
    manager: { name: team.manager.name.trim(), title: team.manager.title.trim(), scfhs: team.manager.scfhs.trim() },
    coordinator: { name: team.coordinator.name.trim(), title: team.coordinator.title.trim() },
    committee: team.committee
      .map((m) => ({ name: m.name.trim(), title: m.title.trim(), role: m.role.trim() }))
      .filter((m) => m.name),
  }
  await saveSiteContent(CPD_TEAM_KEY, '', JSON.stringify(clean))
}

// ── Learner practitioner data (practitioner_info, migration 0090) ──────────
export interface PractitionerInfo {
  scfhs_number: string | null
  profession: string | null
}

export async function getMyPractitionerInfo(userId: string): Promise<PractitionerInfo | null> {
  const { data, error } = await supabase
    .from('practitioner_info')
    .select('scfhs_number, profession')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return null
  return data
}

export async function savePractitionerInfo(userId: string, info: PractitionerInfo) {
  const { error } = await supabase
    .from('practitioner_info')
    .upsert({ user_id: userId, ...info, updated_at: new Date().toISOString() })
  if (error) throw error
}
