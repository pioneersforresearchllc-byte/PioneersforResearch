import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { fetchSiteContent } from '@/lib/content'
import { parseCpdTeam } from '@/lib/cpd'
import { useDocumentMeta } from '@/lib/useDocumentMeta'
import { PageHero } from '@/components/PageHero'
import { Reveal } from '@/components/Reveal'

/** Public CPD (continuing medical education) page: the mission, structure,
 *  scientific committee and process SCFHS reviews for CPD providers. Names
 *  come from the owner-edited `cpd.team` site_content entry. */
export function CpdPage() {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const { data: content } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  const team = parseCpdTeam(content)
  useDocumentMeta(
    ar ? 'التعليم الطبي المستمر (CPD) | الرواد الاستشارية للتدريب والأبحاث' : 'Continuing Professional Development (CPD) | Pioneers Health Research',
    ar
      ? 'إدارة التطوير المهني المستمر في الرواد: الرسالة، والهيكل التنظيمي، واللجنة العلمية، وآلية تخطيط الأنشطة وتقييمها والتحقق من الحضور.'
      : 'CPD at Pioneers Health Research: mission, structure, scientific committee, and how activities are planned, evaluated and attendance verified.',
  )

  const steps = ar
    ? [
        ['تقييم الاحتياج التدريبي', 'استبانات للفئة المستهدفة، وتقييمات المشاركين في الأنشطة السابقة، ومقابلات مع خبراء وجهات صحية، ومراجعة الأدبيات والإحصاءات الصحية.'],
        ['أهداف تعليمية SMART', 'أهداف محددة وقابلة للقياس مبنية على الاحتياج، ومعلنة في صفحة كل نشاط وفي مواده الترويجية.'],
        ['اختيار أساليب التعلم', 'محاضرات تفاعلية، ودراسات حالة، وتمارين تطبيقية، ونقاش وأسئلة — بما يناسب الأهداف، مع وقت كافٍ للراحة والصلاة.'],
        ['اختيار المتحدثين والإفصاح', 'تختار اللجنة العلمية المتحدثين بحسب مؤهلاتهم وخبرتهم، ويُعرض إفصاح كل متحدث عن علاقاته المالية قبل بدء النشاط.'],
        ['مراجعة المحتوى العلمي', 'تراجع اللجنة المحتوى وفق أحدث الأدلة وأفضل الممارسات، وباستقلال تام عن أي جهة تجارية.'],
        ['التقييم والتحسين', 'اختبار قبلي وبعدي، وتقييم لكل جلسة وللنشاط ككل، وتقرير يقيس التغيّر في المعرفة والمهارة ويوجّه التحسين.'],
      ]
    : [
        ['Learning-needs assessment', 'Target-audience surveys, feedback from past participants, interviews with experts and health bodies, literature and health-statistics review.'],
        ['SMART learning objectives', 'Specific, measurable objectives built on the identified needs, published on each activity page and in its promotion.'],
        ['Choosing learning methods', 'Interactive lectures, case studies, practical exercises, discussion and Q&A — matched to the objectives, with adequate rest and prayer time.'],
        ['Speakers & disclosure', 'The scientific committee selects speakers by qualification and experience; each speaker’s financial-relationship disclosure is shown before the activity.'],
        ['Scientific content review', 'The committee reviews content against current evidence and best practice, fully independent of commercial interests.'],
        ['Evaluation & improvement', 'Pre- and post-tests, evaluation of each session and the whole activity, and a report measuring change in knowledge and skills to guide improvement.'],
      ]

  const assurance = ar
    ? [
        ['🪪', 'التسجيل برقم التصنيف المهني', 'يُسجَّل رقم تسجيل الممارس في الهيئة لاحتساب الساعات، ويُحفظ بسرية.'],
        ['⏱️', 'التحقق من الحضور', 'تتحقق المنصة إلكترونيًا من الدخول وإكمال المحتوى وحضور الجلسات المباشرة.'],
        ['📝', 'تقييم واختبار', 'استبانة تقييم إلزامية، واختبار بنسبة نجاح محددة في صفحة النشاط.'],
        ['🏅', 'شهادة قابلة للتحقق', 'تصدر بعد استيفاء المتطلبات، وتحمل رقمًا ورمز QR للتحقق منها.'],
      ]
    : [
        ['🪪', 'Registration with SCFHS number', 'The practitioner’s SCFHS registration number is recorded for hours and kept confidential.'],
        ['⏱️', 'Attendance verification', 'The platform verifies sign-in, content completion and live-session attendance electronically.'],
        ['📝', 'Evaluation & assessment', 'A mandatory evaluation form and a test with the pass mark stated on the activity page.'],
        ['🏅', 'Verifiable certificate', 'Issued once requirements are met, with a number and QR code for verification.'],
      ]

  const roleCard = (role: string, name?: string, extra?: string) => (
    <div className="rounded-xl border border-border bg-white px-4 py-3 text-center shadow-[0_8px_20px_-16px_rgba(11,31,58,0.4)]">
      <div className="text-[13.5px] font-bold text-navy">{role}</div>
      {name && <div className="mt-0.5 text-[13px] text-muted-2">{name}</div>}
      {extra && <div className="mt-0.5 text-[11.5px] text-faint" dir="auto">{extra}</div>}
    </div>
  )

  const policies: [string, string][] = ar
    ? [
        ['/disclosure-policy', 'سياسة الإفصاح وتضارب المصالح والرعاية التجارية'],
        ['/privacy', 'سياسة الخصوصية وحماية البيانات'],
        ['/terms', 'الشروط والأحكام'],
        ['/refund', 'سياسة الاسترجاع والإلغاء'],
        ['/verify', 'التحقق من شهادة'],
      ]
    : [
        ['/disclosure-policy', 'Disclosure, conflict of interest & commercial support policy'],
        ['/privacy', 'Privacy & data protection policy'],
        ['/terms', 'Terms & conditions'],
        ['/refund', 'Refund & cancellation policy'],
        ['/verify', 'Verify a certificate'],
      ]

  return (
    <div>
      <PageHero
        eyebrow={ar ? 'التطوير المهني المستمر' : 'Continuing Professional Development'}
        title={ar ? 'التعليم الطبي المستمر (CPD)' : 'Continuing Medical Education (CPD)'}
        subtitle={
          ar
            ? 'أنشطة تعليمية للممارسين الصحيين في البحث العلمي والممارسة المبنية على الدليل وجودة الرعاية، تُخطَّط وتُقيَّم وفق معايير الهيئة السعودية للتخصصات الصحية.'
            : 'Educational activities for healthcare practitioners in research, evidence-based practice and quality of care, planned and evaluated to SCFHS standards.'
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-16">
        {/* Mission */}
        <Reveal className="mb-10 rounded-3xl bg-gradient-to-br from-navy to-[#14335c] p-7 text-white md:p-9">
          <div className="mb-2 text-[13px] font-semibold tracking-[1px] text-gold">{ar ? 'رسالة التعليم المستمر' : 'CPD mission statement'}</div>
          <p className="text-[17px] leading-[2] md:text-[19px]">
            {ar
              ? 'تحسين معارف الممارسين الصحيين ومهاراتهم وأدائهم في البحث العلمي، والممارسة المبنية على الدليل، وجودة الرعاية الصحية وسلامة المرضى — بأنشطة مبنية على احتياج حقيقي، ومستقلة عن أي مصلحة تجارية، ونقيس أثرها على مستوى الممارس وعلى نتائج الرعاية.'
              : 'To improve healthcare practitioners’ knowledge, skills and performance in research, evidence-based practice, quality of care and patient safety — through needs-based activities, independent of commercial interests, whose impact we measure at the level of the practitioner and of healthcare outcomes.'}
          </p>
        </Reveal>

        {/* Audience */}
        <Reveal className="mb-12">
          <h2 className="font-heading mb-3 text-[22px] font-bold text-navy">{ar ? 'الفئة المستهدفة' : 'Target audience'}</h2>
          <p className="text-[15px] leading-8 text-muted-2">
            {ar
              ? 'الأطباء، والممرضون، والصيادلة، وأخصائيو العلوم الصحية التطبيقية، والباحثون في المجال الصحي — وتُحدَّد الفئة المستهدفة ومستواها بدقة في صفحة كل نشاط.'
              : 'Physicians, nurses, pharmacists, allied health professionals and health researchers — each activity page states its exact target audience and level.'}
          </p>
        </Reveal>

        {/* Structure */}
        <Reveal className="mb-12">
          <h2 className="font-heading mb-5 text-[22px] font-bold text-navy">{ar ? 'الهيكل التنظيمي لإدارة التعليم المستمر' : 'CPD department structure'}</h2>
          <div className="flex flex-col items-center gap-3">
            <div className="w-full max-w-xs">{roleCard(ar ? 'إدارة الشركة' : 'Company management')}</div>
            <div className="h-5 w-px bg-border" aria-hidden />
            <div className="w-full max-w-sm">
              {roleCard(
                ar ? 'مدير التعليم المستمر' : 'CPD manager',
                [team.manager.name, team.manager.title].filter(Boolean).join(' — ') || undefined,
                team.manager.scfhs ? `${ar ? 'رقم التسجيل في الهيئة' : 'SCFHS registration no.'}: ${team.manager.scfhs}` : undefined,
              )}
            </div>
            <div className="h-5 w-px bg-border" aria-hidden />
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
              {roleCard(
                ar ? 'اللجنة العلمية' : 'Scientific committee',
                team.committee.length ? (ar ? `${team.committee.length} أعضاء` : `${team.committee.length} members`) : undefined,
              )}
              {roleCard(
                ar ? 'منسق الأنشطة' : 'Activities coordinator',
                [team.coordinator.name, team.coordinator.title].filter(Boolean).join(' — ') || undefined,
              )}
              {roleCard(ar ? 'الدعم التقني والمنصة' : 'Technical support & platform')}
            </div>
          </div>
        </Reveal>

        {/* Scientific committee */}
        {team.committee.length > 0 && (
          <Reveal className="mb-12">
            <h2 className="font-heading mb-2 text-[22px] font-bold text-navy">{ar ? 'اللجنة العلمية' : 'Scientific planning committee'}</h2>
            <p className="mb-4 text-[14px] leading-7 text-muted">
              {ar
                ? 'مسؤولة عن تحديد الاحتياج، وصياغة الأهداف، واختيار أساليب التعلم والمتحدثين، واعتماد المحتوى، وتقييم المخرجات.'
                : 'Responsible for needs assessment, objectives, learning methods, speaker selection, content approval and outcome evaluation.'}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {team.committee.map((m, i) => (
                <div key={i} className="rounded-xl border border-border bg-white p-4">
                  <div className="text-[15px] font-bold text-navy">{m.name}</div>
                  {m.role && <div className="text-[12.5px] font-semibold text-accent">{m.role}</div>}
                  {m.title && <div className="mt-1 text-[13px] leading-6 text-muted-2">{m.title}</div>}
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {/* Process */}
        <Reveal className="mb-12">
          <h2 className="font-heading mb-5 text-[22px] font-bold text-navy">{ar ? 'كيف نخطط كل نشاط' : 'How we plan every activity'}</h2>
          <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {steps.map(([h, p], i) => (
              <li key={h} className="flex gap-3 rounded-xl border border-border bg-white p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[14px] font-bold text-navy">{i + 1}</span>
                <div>
                  <div className="mb-1 text-[15px] font-bold text-navy">{h}</div>
                  <div className="text-[13.5px] leading-7 text-muted">{p}</div>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>

        {/* Attendance, evaluation, certificates */}
        <Reveal className="mb-12">
          <h2 className="font-heading mb-5 text-[22px] font-bold text-navy">{ar ? 'الحضور والتقييم والشهادات' : 'Attendance, evaluation & certificates'}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            {assurance.map(([icon, h, p]) => (
              <div key={h} className="rounded-xl border border-border bg-white p-4 text-center">
                <div className="mb-2 text-[24px]" aria-hidden>{icon}</div>
                <div className="mb-1 text-[14px] font-bold text-navy">{h}</div>
                <div className="text-[12.5px] leading-6 text-muted">{p}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-xl border border-border-2 bg-bg-soft px-4 py-3 text-[13px] leading-7 text-navy">
            {ar
              ? 'عدد ساعات التعليم المستمر ورقم الاعتماد يظهران في صفحة كل نشاط بعد صدور اعتماده من الهيئة السعودية للتخصصات الصحية فقط.'
              : 'CPD hours and the accreditation number appear on an activity page only after SCFHS has accredited that activity.'}
          </p>
        </Reveal>

        {/* Policies */}
        <Reveal className="mb-6">
          <h2 className="font-heading mb-4 text-[22px] font-bold text-navy">{ar ? 'السياسات' : 'Policies'}</h2>
          <ul className="flex flex-col gap-2">
            {policies.map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="text-[14.5px] font-semibold text-navy underline decoration-gold/60 underline-offset-4">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      <div className="px-4 pb-14 text-center md:px-16">
        <Link to="/courses" className="rounded-full bg-gold px-7 py-3 text-[15px] font-bold text-navy no-underline">
          {ar ? 'تصفّح الأنشطة والدورات' : 'Browse activities & courses'}
        </Link>
      </div>
    </div>
  )
}
