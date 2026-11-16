// Fixed IDs of the demo CPD activity seeded for the SCFHS (Mustamir) review
// (supabase/seed/cpd_demo_activity.sql). The /cpd page and the forms page link
// straight to them so the reviewer can open every feature in one click.
export const DEMO_COURSE_ID = '0cbd0a01-0000-4000-8000-000000000001'
/** Demo session whose self check-in stays open (course_sessions.checkin_always_open). */
export const DEMO_CHECKIN_SESSION_ID = '0cbd0a01-0000-4000-8000-0000000000a3'

/** Demo in-platform video room the demo lectures link to. */
export const DEMO_VIDEO_ROOM_ID = '0cbd0a01-0000-4000-8000-0000000000b1'

export const demoLinks = {
  activity: `/course/${DEMO_COURSE_ID}`,
  learnerSpace: `/student/courses/${DEMO_COURSE_ID}`,
  content: `/student/courses/${DEMO_COURSE_ID}?tab=content`,
  quiz: `/student/courses/${DEMO_COURSE_ID}?tab=quiz`,
  evaluation: `/student/courses/${DEMO_COURSE_ID}?tab=evaluation`,
  attendance: `/student/courses/${DEMO_COURSE_ID}?tab=attendance`,
  discussion: `/student/courses/${DEMO_COURSE_ID}?tab=qa`,
  lectures: `/student/courses/${DEMO_COURSE_ID}?tab=lectures`,
  checkin: `/attend/${DEMO_CHECKIN_SESSION_ID}`,
  /** Built-in video conference room of the demo lectures (group_sessions). */
  videoRoom: `/group-call/${DEMO_VIDEO_ROOM_ID}`,
  teacherSpace: `/teacher/courses/${DEMO_COURSE_ID}`,
  ownerReports: '/owner/cpd',
  forms: '/cpd/forms',
  login: '/login',
}
