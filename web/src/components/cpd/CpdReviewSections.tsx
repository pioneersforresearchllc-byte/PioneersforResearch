// Sections of the public /cpd page that answer the SCFHS (Mustamir) review
// notes point by point: direct links into every feature, the platform's
// learning equipment and methods (and where each lives), the learner journey
// from sign-in to recorded hours, user roles, attendance mechanisms, live
// indicators, and how the speakers list is updated from evaluations.
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Reveal } from '@/components/Reveal'
import { demoLinks } from '@/lib/cpdDemo'
import { getPublicIndicators, pct } from '@/lib/cpdActivity'

type Tx = (ar: string, en: string) => string

const h2 = 'font-heading mb-3 text-[22px] font-bold text-navy'
const lead = 'mb-5 text-[14.5px] leading-8 text-muted-2'

/** Speakers averaging below this (out of 5) go to committee review — same
 *  threshold as the owner's CPD report (CpdReportsPage). */
export const SPEAKER_REVIEW_THRESHOLD = 3.5

export function DirectLinks({ tx }: { tx: Tx }) {
  const links: [string, string, string, string][] = [
    ['🧪', tx('النشاط التجريبي', 'Demo activity'), tx('صفحة النشاط العامة: الأهداف والمحاور والمتحدثون والإفصاح، والتسجيل.', 'Public page: objectives, topics, speakers, disclosure, enrolment.'), demoLinks.activity],
    ['📂', tx('محاور النشاط وتحميل المحتوى العلمي', 'Topics & download content'), tx('المحاور، والمواد العلمية (PDF، عروض، فيديو، صوت، روابط) مع زر تنزيل لكل مادة.', 'Topics and materials (PDF, slides, video, audio, links), each downloadable.'), demoLinks.content],
    ['🎥', tx('الجلسات المباشرة', 'Live sessions'), tx('مواعيد المحاضرات المباشرة وزر الدخول إلى المؤتمر المرئي لكل محاضرة.', 'Live lecture schedule with a join button to each lecture’s video conference.'), demoLinks.lectures],
    ['🎦', tx('غرفة المؤتمر المرئي والصوتي', 'Video & audio conference room'), tx('مؤتمر داخل المنصة بالصوت والصورة ومشاركة الشاشة والدردشة. المسؤول أو المحاضر يفتح الغرفة كمضيف، والمتعلم يدخل بعد قبول المضيف.', 'In-platform conference with audio, video, screen sharing and chat. Admin or lecturer opens it as host; learners join once admitted.'), demoLinks.videoRoom],
    ['🕒', tx('رابط تسجيل الحضور المباشر', 'Direct attendance link'), tx('يسجّل المتدرب حضوره بنقرة (أو برمز QR) — هذه جلسة تجريبية مفتوحة دائمًا.', 'Learner checks in with one tap (or QR) — an always-open demo session.'), demoLinks.checkin],
    ['📝', tx('الاختبار الإلكتروني', 'Online assessment'), tx('اختبار يُصحَّح آليًا بنسبة نجاح محددة.', 'Auto-graded test with a stated pass mark.'), demoLinks.quiz],
    ['⭐', tx('نموذج تقييم النشاط والمتحدثين', 'Activity & speaker evaluation'), tx('تقييم إلزامي للنشاط والمتحدثين والرضا عن المنصة.', 'Mandatory evaluation of activity, speakers and the LMS.'), demoLinks.evaluation],
    ['📋', tx('سجل حضور المتدرب', 'Learner attendance record'), tx('يعرض للمتدرب حضوره في كل جلسة وطريقة تسجيله.', 'Shows the learner’s attendance per session and method.'), demoLinks.attendance],
    ['💬', tx('الأسئلة والنقاش الجماعي', 'Q&A & group discussion'), tx('منتدى نقاش لكل نشاط بين المتدربين والمحاضر.', 'A discussion forum per activity for learners and lecturer.'), demoLinks.discussion],
    ['🗂️', tx('نماذج التقييم والإفصاح (عرض وطباعة)', 'Evaluation & disclosure forms'), tx('جميع النماذج المستخدمة، مع رابط النسخة الإلكترونية لكل نموذج.', 'Every form used, each linked to its live in-platform version.'), demoLinks.forms],
    ['📊', tx('تقارير ومؤشرات التعليم المستمر', 'CPD reports & indicators'), tx('للإدارة: تقرير كل نشاط، وتقييم المتحدثين، والمؤشرات.', 'Admin: per-activity report, speaker ratings, indicators.'), demoLinks.ownerReports],
  ]
  return (
    <Reveal className="mb-12 rounded-3xl border-2 border-gold/50 bg-gold/5 p-6 md:p-8">
      <h2 className={h2}>{tx('جولة في المنصة — روابط مباشرة', 'Platform tour — direct links')}</h2>
      <p className="mb-5 text-[14px] leading-7 text-muted-2">
        {tx(
          'كل رابط يفتح الخاصية مباشرة داخل المنصة على النشاط التجريبي. روابط المتدرب تتطلب الدخول بحساب متدرب، وروابط التقارير بحساب الإدارة — والدخول لكل الأدوار من صفحة واحدة.',
          'Each link opens the feature directly on the demo activity. Learner links need a learner login, reports need an admin login — every role signs in on the same page.',
        )}
      </p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {links.map(([icon, title, desc, to]) => (
          <Link
            key={to}
            to={to}
            className="flex gap-3 rounded-xl border border-border bg-white p-3.5 no-underline transition-colors hover:border-navy"
          >
            <span className="text-[22px] leading-none" aria-hidden>{icon}</span>
            <span>
              <span className="block text-[14px] font-bold text-navy">{title}</span>
              <span className="mt-0.5 block text-[12.5px] leading-6 text-muted">{desc}</span>
              <span className="mt-0.5 block text-[11.5px] text-faint" dir="ltr">{to}</span>
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-4 text-center">
        <Link to={demoLinks.login} className="inline-block rounded-full bg-navy px-6 py-2.5 text-[14px] font-bold text-white no-underline">
          {tx('الدخول إلى المنصة (لجميع الأدوار)', 'Sign in (all roles)')}
        </Link>
      </div>
    </Reveal>
  )
}

export function PlatformEquipment({ tx }: { tx: Tx }) {
  const rows: [string, string, string][] = [
    [tx('النقاش الجماعي', 'Group discussion'), tx('منتدى أسئلة ونقاش لكل نشاط، ونقاش مباشر بالصوت والصورة والدردشة أثناء الجلسات، وغرف دردشة جماعية.', 'A Q&A/discussion forum per activity, live voice/video/chat discussion in sessions, and group chat rooms.'), tx('النشاط ← الأسئلة والنقاش', 'Activity → Q&A')],
    [tx('فيديو لورش تدريبية', 'Workshop videos'), tx('ورش مباشرة بالفيديو داخل المنصة، وتُرفع تسجيلاتها لاحقًا كمواد فيديو يعود إليها المتدرب.', 'Live video workshops in the platform; recordings are added later as video materials.'), tx('النشاط ← الجلسات / المحتوى', 'Activity → Sessions / Content')],
    [tx('التعلم القائم على المحاكاة ودراسات الحالة', 'Simulation & case-based learning'), tx('سيناريوهات لمواقف من الممارسة الصحية ودراسات حالة تُحلّ وتُناقش في الجلسات، ودروس تفاعلية مكتوبة.', 'Practice scenarios and case studies solved and discussed in sessions, plus interactive written lessons.'), tx('النشاط ← المحتوى / الدرس التفاعلي', 'Activity → Content / Lesson')],
    [tx('المكتبة الإلكترونية', 'E-library'), tx('مراجع وكتب إلكترونية (PDF) وروابط لمصادر علمية موثوقة في كل نشاط، ومقالات علمية في المنصة.', 'E-books/references (PDF) and links to trusted sources per activity, plus scientific articles.'), tx('النشاط ← المحتوى · المقالات', 'Activity → Content · Articles')],
    [tx('الوسائط المقروءة والمسموعة والمرئية', 'Read / audio / visual media'), tx('كتب إلكترونية، وتسجيلات صوتية، وعروض تقديمية، وأفلام فيديو، وملاحظات مكتوبة — مع عارض داخل المنصة وزر تنزيل وتتبّع إكمال كل مادة.', 'E-books, audio, slides, videos and notes — in-platform viewer, download button and per-item completion tracking.'), tx('النشاط ← المحتوى', 'Activity → Content')],
    [tx('غرف الدردشة', 'Chat rooms'), tx('محادثات فورية فردية وجماعية بين المتدربين والمحاضرين والإدارة.', 'Instant one-to-one and group chats between learners, lecturers and admin.'), tx('لوحة المستخدم ← المحادثات', 'Dashboard → Chat')],
    [tx('المؤتمرات الصوتية ومؤتمرات الفيديو', 'Audio & video conferencing'), tx('مكالمات صوت وفيديو جماعية مدمجة في المنصة (تقنية Daily) دون برامج خارجية، مع مشاركة الشاشة.', 'Built-in group audio/video calls (Daily) with screen sharing — no external software.'), tx('النشاط ← الجلسات', 'Activity → Sessions')],
    [tx('الأدوات والخصائص الإلكترونية', 'E-tools & features'), tx('الاختبارات الآلية، ونماذج التقييم، وتسجيل الحضور الذاتي برابط أو QR، والإعلانات والإشعارات الفورية، والواجبات، والشهادات القابلة للتحقق.', 'Auto-graded tests, evaluation forms, self check-in by link/QR, announcements and instant notifications, assignments, verifiable certificates.'), tx('داخل كل نشاط', 'Inside every activity')],
  ]
  return (
    <Reveal className="mb-12">
      <h2 className={h2}>{tx('تجهيزات المنصة والأساليب التعليمية التفاعلية', 'Platform equipment & interactive learning methods')}</h2>
      <p className={lead}>
        {tx(
          'تُختار الأساليب لكل نشاط بحسب الاحتياج التعليمي والأهداف المحددة له (تُعلن في صفحة النشاط)، وتوفّر المنصة الأدوات التالية فعليًا:',
          'Methods are chosen per activity from its learning needs and stated objectives (published on the activity page). The platform provides these tools:',
        )}
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] border-collapse bg-white text-[13px]">
          <thead>
            <tr className="bg-bg-soft text-start text-navy">
              <th className="p-3 text-start font-bold">{tx('الأسلوب / الأداة', 'Method / tool')}</th>
              <th className="p-3 text-start font-bold">{tx('كيف توفّره المنصة', 'How the platform provides it')}</th>
              <th className="p-3 text-start font-bold">{tx('مكانه', 'Where')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([m, how, where]) => (
              <tr key={m} className="border-t border-border align-top">
                <td className="p-3 font-semibold text-navy">{m}</td>
                <td className="p-3 leading-6 text-muted-2">{how}</td>
                <td className="p-3 text-muted">{where}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[13px] leading-7 text-muted">
        {tx(
          'الربط بالاحتياج والأهداف: تحدد اللجنة العلمية الاحتياج التعليمي لكل نشاط، ثم تصوغ أهدافًا SMART، وتختار من الأدوات أعلاه ما يحققها (مثال: هدف مهاري ← دراسة حالة وتمرين تطبيقي ونقاش؛ هدف معرفي ← محاضرة تفاعلية ومراجع واختبار).',
          'Link to needs and objectives: the scientific committee defines each activity’s learning need, writes SMART objectives, and picks the tools above that achieve them (e.g. a skill objective → case study, exercise and discussion; a knowledge objective → interactive lecture, references and a test).',
        )}
      </p>
    </Reveal>
  )
}

export function LearnerJourney({ tx }: { tx: Tx }) {
  const steps: [string, string, string?][] = [
    [tx('إنشاء الحساب', 'Create an account'), tx('يسجّل الممارس بالبريد ورمز تحقق، ويضيف رقم تسجيله في الهيئة ومهنته في حسابه لاحتساب الساعات.', 'The practitioner registers (email + verification code) and adds their SCFHS number and profession for hours.'), '/register'],
    [tx('اختيار النشاط والتسجيل', 'Choose & enrol'), tx('يطّلع على صفحة النشاط (الأهداف، المحاور، المتحدثون، الإفصاح، متطلبات الشهادة) ثم يسجّل فيه.', 'Reviews the activity page (objectives, topics, speakers, disclosure, certificate requirements) and enrols.'), demoLinks.activity],
    [tx('الاطلاع على المحاور وتحميل المحتوى', 'Topics & content'), tx('يفتح محاور النشاط والمواد العلمية ويعرضها أو ينزّلها، وتُسجَّل نسبة إكماله لكل مادة.', 'Opens the topics and materials, views or downloads them; completion is tracked per item.'), demoLinks.content],
    [tx('حضور الجلسات المباشرة', 'Attend live sessions'), tx('يدخل مؤتمر الفيديو داخل المنصة في موعده، ويشارك في النقاش والأسئلة.', 'Joins the in-platform video conference on time and takes part in discussion and Q&A.'), demoLinks.lectures],
    [tx('تسجيل الحضور', 'Record attendance'), tx('يسجّل حضوره برابط الحضور المباشر أو رمز QR خلال نافذة الجلسة، أو يرصده المحاضر/المنسق يدويًا.', 'Checks in by the direct link or QR within the session window, or the lecturer/coordinator marks it.'), demoLinks.checkin],
    [tx('التعلم الذاتي والنقاش', 'Self-paced study & discussion'), tx('يكمل المحتوى الذاتي بوتيرته، ويشارك في منتدى النقاش والدردشة.', 'Completes self-paced content and joins the discussion forum and chat.'), demoLinks.discussion],
    [tx('الاختبار', 'Assessment'), tx('يؤدي الاختبار الإلكتروني ويُصحَّح آليًا مقابل نسبة النجاح المعلنة.', 'Takes the online test, auto-graded against the stated pass mark.'), demoLinks.quiz],
    [tx('تقييم النشاط والمتحدثين', 'Evaluate'), tx('يعبّئ نموذج التقييم الإلزامي (النشاط، المتحدثون، الرضا عن المنصة).', 'Completes the mandatory evaluation (activity, speakers, LMS satisfaction).'), demoLinks.evaluation],
    [tx('الشهادة وتسجيل الساعات', 'Certificate & hours'), tx('بعد استيفاء الحضور والنجاح والتقييم تصدر شهادة برقم ورمز QR وعدد الساعات المعتمدة ورقم الاعتماد، وتُرفع بيانات الحضور والساعات للهيئة وفق إجراءاتها.', 'Once attendance, pass and evaluation are met, a certificate with number, QR, accredited hours and accreditation no. is issued; attendance and hours are submitted to SCFHS per its procedures.'), '/student/certificates'],
    [tx('التحقق من الشهادة', 'Verify'), tx('يمكن لأي جهة التحقق من الشهادة برقمها أو رمزها.', 'Anyone can verify the certificate by its number or QR.'), '/verify'],
  ]
  return (
    <Reveal className="mb-12">
      <h2 className={h2}>{tx('رحلة المتعلم داخل المنصة — من الدخول حتى تسجيل الساعات', 'The learner journey — from sign-in to recorded hours')}</h2>
      <ol className="flex flex-col gap-2">
        {steps.map(([title, desc, to], i) => (
          <li key={title} className="flex gap-3 rounded-xl border border-border bg-white p-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-[13px] font-bold text-white">{i + 1}</span>
            <div className="flex-1">
              <div className="text-[14.5px] font-bold text-navy">{title}</div>
              <div className="text-[13px] leading-7 text-muted-2">{desc}</div>
            </div>
            {to && (
              <Link to={to} className="self-center whitespace-nowrap text-[12.5px] font-semibold text-navy underline decoration-gold/60 underline-offset-4">
                {tx('افتح', 'Open')}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[13px] leading-7 text-muted">
        {tx(
          'أنواع أنشطة التطوير المهني المفعّلة تقنيًا: محاضرات وورش افتراضية متزامنة، وأنشطة تعلم ذاتي غير متزامنة، وأنشطة مدمجة (مباشر + ذاتي)، وبرامج تدريبية متعددة الوحدات.',
          'CPD activity types enabled in the platform: synchronous virtual lectures and workshops, asynchronous self-paced activities, blended (live + self-paced) activities, and multi-module training programmes.',
        )}
      </p>
    </Reveal>
  )
}

export function UserRoles({ tx }: { tx: Tx }) {
  const roles: [string, string][] = [
    [tx('مسؤول المنصة (Admin)', 'Platform admin'), tx('إدارة الأنشطة والمستخدمين والمحتوى والشهادات، وتقارير ومؤشرات التعليم المستمر، والسياسات وبيانات اللجنة العلمية.', 'Manages activities, users, content and certificates, CPD reports and indicators, policies and committee data.')],
    [tx('منسق الأنشطة', 'Activities coordinator'), tx('إنشاء النشاط وبياناته (الأهداف، المحاور، المتحدثون، الإفصاح)، وجدولة الجلسات، ورصد الحضور، ومتابعة التقييمات وإصدار الشهادات.', 'Creates activities and their details (objectives, topics, speakers, disclosure), schedules sessions, records attendance, follows evaluations and certificates.')],
    [tx('المحاضر / المتحدث', 'Lecturer / speaker'), tx('رفع المحتوى العلمي، وإدارة الجلسات المباشرة، ومشاركة رابط/رمز الحضور، ورصد الحضور، والرد على النقاش، ومتابعة تقرير نشاطه.', 'Uploads content, runs live sessions, shares the check-in link/QR, records attendance, answers discussion, sees their activity report.')],
    [tx('المتعلم (الممارس الصحي)', 'Learner (health practitioner)'), tx('التسجيل في الأنشطة، والمحتوى والتنزيل، والحضور، والاختبار، والتقييم، والشهادة.', 'Enrols, studies and downloads content, attends, takes the test, evaluates, gets the certificate.')],
  ]
  return (
    <Reveal className="mb-12">
      <h2 className={h2}>{tx('أدوار المستخدمين في المنصة', 'User roles')}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {roles.map(([r, d]) => (
          <div key={r} className="rounded-xl border border-border bg-white p-4">
            <div className="mb-1 text-[14.5px] font-bold text-navy">{r}</div>
            <div className="text-[13px] leading-7 text-muted-2">{d}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-muted">
        {tx('جميع الأدوار تدخل من صفحة الدخول نفسها، وتُوجَّه المنصة كل حساب تلقائيًا إلى لوحته.', 'All roles sign in on the same page; each account is routed to its own dashboard automatically.')}
      </p>
    </Reveal>
  )
}

export function AttendanceMechanism({ tx }: { tx: Tx }) {
  const items: [string, string][] = [
    [tx('رابط الحضور المباشر ورمز QR', 'Direct link & QR'), tx('لكل جلسة رابط حضور ورمز QR يعرضه المحاضر؛ يسجّل المتدرب المسجّل في النشاط حضوره بنقرة من 30 دقيقة قبل البدء حتى 4 ساعات بعده (بتوقيت الرياض)، ويُتحقق من ذلك في الخادم.', 'Each session has a check-in link and QR shown by the lecturer; an enrolled learner checks in with one tap from 30 min before to 4 h after start (Riyadh time), enforced server-side.')],
    [tx('الرصد اليدوي', 'Manual marking'), tx('يرصد المحاضر أو المنسق الحضور والغياب من قائمة المتدربين لكل جلسة، ولا يُستبدل رصده بالتسجيل الذاتي.', 'The lecturer or coordinator marks present/absent per session; their mark is never overwritten by self check-in.')],
    [tx('إكمال المحتوى', 'Content completion'), tx('تُسجَّل نسبة إكمال كل متدرب لمصادر التعلم الذاتي.', 'Each learner’s completion of self-paced resources is recorded.')],
    [tx('السجل والشهادة', 'Record & certificate'), tx('يرى المتدرب سجل حضوره، وتشترط الشهادة نسبة الحضور المعلنة، وتُحفظ السجلات خمس سنوات وتُقدَّم للهيئة عند الطلب.', 'The learner sees their record; the certificate requires the stated attendance; records are kept five years and provided to SCFHS on request.')],
  ]
  return (
    <Reveal className="mb-12">
      <h2 className={h2}>{tx('آلية تسجيل الحضور والتقنية المستخدمة', 'Attendance mechanism & technology')}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map(([t, d]) => (
          <div key={t} className="rounded-xl border border-border bg-white p-4">
            <div className="mb-1 text-[14px] font-bold text-navy">{t}</div>
            <div className="text-[13px] leading-7 text-muted-2">{d}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[13px]">
        <Link to={demoLinks.checkin} className="font-semibold text-navy underline decoration-gold/60 underline-offset-4">{tx('جرّب رابط الحضور المباشر', 'Try the direct check-in link')}</Link>
        <Link to={demoLinks.attendance} className="font-semibold text-navy underline decoration-gold/60 underline-offset-4">{tx('سجل حضور المتدرب', 'Learner attendance record')}</Link>
      </div>
    </Reveal>
  )
}

export function PublicIndicators({ tx }: { tx: Tx }) {
  const { data } = useQuery({ queryKey: ['cpd-public-indicators'], queryFn: getPublicIndicators, staleTime: 5 * 60_000 })
  const cards: [string, string, string][] = data
    ? [
        [tx('عدد مصادر التعلم المستوفية لمعايير التطوير المهني', 'Learning resources meeting CPD standards'), String(data.resources_total), tx('مواد منشورة ضمن أنشطة مكتملة البيانات (أهداف، محاور، متحدثون، إفصاح)', 'Published materials in activities with full CPD details')],
        [tx('نسبة استخدام الممارسين لمصادر التعلم', 'Practitioners using the resources'), pct(data.learners_using_resources, data.learners), `${data.learners_using_resources} / ${data.learners}`],
        [tx('نسبة الرضا عن نظام إدارة التعلم (المنصة)', 'LMS satisfaction rate'), pct(data.lms_satisfied, data.lms_rated), tx(`تقييم 4 أو 5 من 5 — ${data.lms_rated} تقييم`, `Rated 4–5 of 5 — ${data.lms_rated} ratings`)],
        [tx('نسبة الرضا العام عن الأنشطة', 'Overall activity satisfaction'), pct(data.overall_satisfied, data.overall_rated), `${data.overall_rated} ${tx('تقييم', 'ratings')}`],
        [tx('نسبة النجاح في الاختبارات', 'Assessment pass rate'), pct(data.quiz_passed, data.quiz_takers), `${data.quiz_takers} ${tx('متدرب', 'learners')}`],
        [tx('نسبة الحضور', 'Attendance rate'), pct(data.attendance_present, data.attendance_marks), `${data.attendance_marks} ${tx('رصد', 'marks')}`],
      ]
    : []
  return (
    <Reveal className="mb-12">
      <h2 className={h2}>{tx('مؤشرات المنصة (تُحدَّث تلقائيًا)', 'Platform indicators (live)')}</h2>
      <p className={lead}>
        {tx(
          'تُحسب من بيانات المنصة الفعلية وتراجعها اللجنة العلمية دوريًا لتحسين الأنشطة. تُعرض هنا أرقام مجمّعة فقط دون أي بيانات شخصية.',
          'Computed from live platform data and reviewed periodically by the scientific committee. Aggregates only — no personal data.',
        )}
      </p>
      {data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {cards.map(([label, value, sub]) => (
            <div key={label} className="rounded-xl border border-border bg-white p-4 text-center">
              <div className="font-heading text-[28px] font-bold text-navy">{value}</div>
              <div className="mt-1 text-[13px] font-semibold text-navy">{label}</div>
              <div className="mt-0.5 text-[11.5px] text-muted">{sub}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-border bg-white p-4 text-[13px] text-muted">{tx('تُعرض المؤشرات هنا عند توفر بيانات.', 'Indicators appear here once data is available.')}</p>
      )}
    </Reveal>
  )
}

export function SpeakerListUpdate({ tx }: { tx: Tx }) {
  const steps: string[] = [
    tx('يقيّم كل متدرب كل متحدث داخل المنصة في نموذج تقييم النشاط (المعرفة العلمية، وأسلوب العرض، وملاحظات مكتوبة).', 'Each learner rates every speaker in the in-platform evaluation (scientific knowledge, delivery, written notes).'),
    tx('تحسب المنصة تلقائيًا متوسط كل متحدث في تقرير النشاط لدى الإدارة واللجنة العلمية.', 'The platform computes each speaker’s average in the activity report for admin and the committee.'),
    tx(`متوسط ${SPEAKER_REVIEW_THRESHOLD} من 5 فأكثر: يبقى المتحدث في قائمة المتحدثين المعتمدين.`, `${SPEAKER_REVIEW_THRESHOLD}/5 or above: the speaker stays on the approved list.`),
    tx(`أقل من ${SPEAKER_REVIEW_THRESHOLD}: يُحال إلى اللجنة العلمية — تغذية راجعة تطويرية ومراجعة المحتوى، وعند التكرار يُستبعد من الأنشطة القادمة.`, `Below ${SPEAKER_REVIEW_THRESHOLD}: referred to the committee — developmental feedback and content review; if repeated, excluded from future activities.`),
    tx('تُحدَّث قائمة بيانات المتحدثين (المؤهلات، والإفصاح، ونتيجة التقييم، والحالة) بعد كل نشاط، وتُوثَّق القرارات في محضر اللجنة، وتُراجع القائمة كاملة سنويًا.', 'The speakers register (credentials, disclosure, rating, status) is updated after each activity, decisions are minuted, and the whole list is reviewed annually.'),
  ]
  return (
    <Reveal className="mb-12">
      <h2 className={h2}>{tx('آلية تحديث قائمة المتحدثين بناءً على التقييم', 'Updating the speakers list from evaluations')}</h2>
      <ol className="flex flex-col gap-2 text-[13.5px] leading-7 text-muted-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 rounded-xl border border-border bg-white p-3.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[13px] font-bold text-navy">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-3 text-[13px]">
        <Link to={`${demoLinks.forms}#speaker`} className="font-semibold text-navy underline decoration-gold/60 underline-offset-4">{tx('نموذج تقييم المتحدث', 'Speaker evaluation form')}</Link>
        <Link to={demoLinks.evaluation} className="font-semibold text-navy underline decoration-gold/60 underline-offset-4">{tx('النموذج الإلكتروني داخل المنصة', 'Live form in the platform')}</Link>
        <Link to={demoLinks.ownerReports} className="font-semibold text-navy underline decoration-gold/60 underline-offset-4">{tx('تقرير تقييم المتحدثين (الإدارة)', 'Speaker ratings report (admin)')}</Link>
      </div>
    </Reveal>
  )
}
