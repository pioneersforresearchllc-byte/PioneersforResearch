import type { ReactNode } from 'react'

/**
 * Line icon for each dashboard tab, keyed by tab.key. Keeps the sidebar from
 * reading as a flat list of words. Unknown keys fall back to a neutral dot.
 */
const S = (children: ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const home = S(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>)
const book = S(<><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" /><path d="M18 3v18" /></>)
const clipboard = S(<><rect x="8" y="3" width="8" height="4" rx="1" /><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><path d="M9 12h6" /><path d="M9 16h4" /></>)
const chart = S(<><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="13" width="3" height="4" /></>)
const award = S(<><circle cx="12" cy="9" r="6" /><path d="M8.5 14 7 22l5-3 5 3-1.5-8" /></>)
const message = S(<><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /></>)
const fileText = S(<><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M9 13h6" /><path d="M9 17h4" /></>)
const inbox = S(<><path d="M3 12h5l2 3h4l2-3h5" /><path d="M4 5h16a1 1 0 0 1 1 1v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1z" /></>)
const user = S(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>)
const users = S(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 3-5 6-5s6 1.7 6 5" /><path d="M16 5.5a3.2 3.2 0 0 1 0 6" /><path d="M17 15c2.5.4 4 2.2 4 5" /></>)
const check = S(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>)
const briefcase = S(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></>)
const userPlus = S(<><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.5 3-5.5 6-5.5s6 2 6 5.5" /><path d="M18 8v6M15 11h6" /></>)
const layers = S(<><path d="M12 3 3 8l9 5 9-5z" /><path d="m3 13 9 5 9-5" /></>)
const tag = S(<><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" /><circle cx="7.5" cy="7.5" r="1.3" /></>)
const building = S(<><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" /></>)
const shield = S(<><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z" /></>)
const mail = S(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>)
const layout = S(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></>)
const dot = S(<circle cx="12" cy="12" r="3" />)

const MAP: Record<string, ReactNode> = {
  overview: home,
  'inst-home': home,
  courses: book,
  assignments: clipboard,
  grades: chart,
  certificates: award,
  feedback: message,
  articles: fileText,
  requests: inbox,
  'service-requests': inbox,
  chat: message,
  messages: message,
  account: user,
  students: users,
  review: check,
  assigned: briefcase,
  applications: userPlus,
  teachers: users,
  services: layers,
  discounts: tag,
  institutions: building,
  'inst-consultations': message,
  'inst-consult': message,
  'inst-team': users,
  admins: shield,
  accounts: users,
  contact: mail,
  'home-content': layout,
}

export function navIcon(key: string): ReactNode {
  return MAP[key] ?? dot
}
