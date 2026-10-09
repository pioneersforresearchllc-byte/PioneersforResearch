import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/useDocumentMeta'
import { fetchSiteContent, resolveWhatsapp } from '@/lib/content'
import { Reveal } from '@/components/Reveal'
import { featureLines, pkgText, resolveOrgPackages, type OrgPackage } from '@/lib/orgPackages'
import { CheckItem, DetailsDialog } from '@/components/DetailsDialog'
import { Price } from '@/components/Riyal'

type Tx = (a: string, e: string) => string

function PackageHeader({ p, index, ar, tx }: { p: OrgPackage; index: number; ar: boolean; tx: Tx }) {
  return (
    <div className={`px-5 pb-4 pt-5 text-white ${p.featured ? 'bg-gradient-to-br from-navy to-[#14335c]' : 'bg-navy'}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-heading text-[13px] font-bold tracking-[2px] text-gold" dir="ltr">
          {String(index + 1).padStart(2, '0')}
        </span>
        {p.featured && <span className="rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold text-navy">{tx('الأكثر طلبًا', 'Most requested')}</span>}
      </div>
      <h3 className="font-heading text-[19px] font-bold">{pkgText(p, 'name', ar)}</h3>
      {pkgText(p, 'duration', ar) && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-white/75">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          {pkgText(p, 'duration', ar)}
        </div>
      )}
    </div>
  )
}

function PriceBox({ p, ar, tx }: { p: OrgPackage; ar: boolean; tx: Tx }) {
  return (
    <div className="mb-4 rounded-xl bg-bg-soft px-4 py-3 text-center">
      {p.price_from ? (
        <>
          <div className="text-[11.5px] text-muted">{tx('ابتداءً من', 'Starting from')}</div>
          <div className="font-heading text-[20px] font-bold text-navy">
            <Price cents={p.price_from * 100} locale={ar ? 'ar-SA' : 'en-US'} />
          </div>
        </>
      ) : (
        <>
          <div className="text-[11.5px] text-muted">{tx('التسعير', 'Pricing')}</div>
          <div className="text-[15px] font-bold text-navy">{tx('حسب احتياج الجهة', 'Tailored to your needs')}</div>
        </>
      )}
    </div>
  )
}

/**
 * Public landing page for organisations (hospitals, medical research centers,
 * universities, training centers, government bodies). A decision-maker reads
 * this before registering an institution account: offerings, the health-sector
 * track, how engagement works, and the company's official credentials.
 * Primary CTA → /quote?for=institution (institution flavour of the quote wizard).
 */
export function InstitutionsPage() {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const tx = (a: string, e: string) => (ar ? a : e)
  const { data: content } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  const wa = resolveWhatsapp(content)
  const packages = resolveOrgPackages(content).filter((p) => p.active)
  const [openPkg, setOpenPkg] = useState<OrgPackage | null>(null)
  useDocumentMeta(
    'للمؤسسات والجهات الصحية | Pioneers Health Research',
    'برامج تدريب واستشارات في البحث العلمي الصحي مصمّمة للمستشفيات ومراكز الأبحاث والجامعات ومراكز التدريب في المملكة.',
  )

  const audiences = [
    { icon: '🏥', h: tx('المستشفيات ومراكز البحث الطبي', 'Hospitals & medical research centers'), p: tx('رفع كفاءة الأطباء والممارسين الصحيين في إجراء الأبحاث ونشرها.', 'Build clinicians’ capacity to run and publish research.') },
    { icon: '🎓', h: tx('الجامعات والكليات الصحية', 'Universities & health colleges'), p: tx('دعم طلاب الدراسات العليا وأعضاء هيئة التدريس في مشاريعهم البحثية.', 'Support graduate students and faculty in their research projects.') },
    { icon: '🏫', h: tx('مراكز التدريب', 'Training centers'), p: tx('برامج بحثية جاهزة يقدّمها المركز لمتدربيه بالشراكة معنا.', 'Ready-made research programs your center delivers in partnership with us.') },
    { icon: '🏛️', h: tx('الجهات الحكومية والشركات', 'Government bodies & companies'), p: tx('استشارات ودراسات وتقارير بحثية حسب احتياج الجهة.', 'Research consulting, studies and reports tailored to your needs.') },
  ]

  const offerings = [
    { icon: '👥', h: tx('تدريب داخلي لمنسوبيكم', 'In-house training for your staff'), p: tx('ورش وبرامج تدريبية تُقدَّم حضوريًا في مقر جهتكم أو عن بُعد، بمحتوى وجدول يناسب فريقكم.', 'Workshops and programs delivered on-site or remotely, with content and schedule fitted to your team.') },
    { icon: '🧩', h: tx('برامج مخصّصة', 'Custom programs'), p: tx('نصمّم البرنامج من الصفر حسب مستوى المتدربين وأهداف الجهة ومخرجاتها المطلوبة.', 'Built from scratch around your trainees’ level, your goals and the outcomes you need.') },
    { icon: '🤝', h: tx('شراكة مع مراكز التدريب', 'Training-center partnership'), p: tx('نوفّر المحتوى والمدرّبين، ويقدّم المركز البرنامج تحت مظلته لمتدربيه.', 'We provide content and trainers; your center offers the program to its trainees under its own umbrella.') },
    { icon: '📊', h: tx('استشارات بحثية مؤسسية', 'Institutional research consulting'), p: tx('مراجعة المقترحات، والتحليل الإحصائي، ودعم النشر العلمي لفرق البحث لديكم.', 'Proposal review, statistical analysis and publication support for your research teams.') },
  ]

  const healthTopics = ar
    ? [
        'منهجية البحث السريري وأنواع الدراسات (Cohort / RCT / Case-control)',
        'الإحصاء الحيوي وتحليل البيانات (SPSS / R)',
        'المراجعات المنهجية والتحليل التجميعي (Systematic Review / Meta-analysis)',
        'أخلاقيات البحث ولجان المراجعة المؤسسية (IRB)',
        'الممارسة السريرية الجيدة (GCP)',
        'كتابة الأوراق العلمية والنشر في المجلات المحكّمة',
        'كتابة المقترحات البحثية وطلبات المنح',
        'تحويل الأسئلة السريرية إلى مشاريع بحثية قابلة للتنفيذ',
      ]
    : [
        'Clinical research methodology & study designs (Cohort / RCT / Case-control)',
        'Biostatistics & data analysis (SPSS / R)',
        'Systematic reviews & meta-analysis',
        'Research ethics & Institutional Review Boards (IRB)',
        'Good Clinical Practice (GCP)',
        'Scientific writing & publishing in peer-reviewed journals',
        'Research proposals & grant writing',
        'Turning clinical questions into feasible research projects',
      ]

  const healthNotes = [
    { h: tx('ساعات التعليم المستمر', 'CME / CPD hours'), p: tx('نُنسّق مع قسم التعليم الطبي لديكم لاحتساب ساعات التعليم المستمر للبرنامج.', 'We coordinate with your medical-education department to have the program counted for CME/CPD hours.') },
    { h: tx('السرية وحماية البيانات', 'Confidentiality & data protection'), p: tx('التدريب على بيانات افتراضية دون أي بيانات مرضى، مع استعدادنا لتوقيع اتفاقية عدم إفصاح.', 'Training uses simulated data — never patient records — and we are ready to sign an NDA.') },
    { h: tx('حضوري داخل المنشأة', 'On-site delivery'), p: tx('نقدّم البرامج داخل منشأتكم وفق أنظمة الدخول والتصاريح المعتمدة لديكم.', 'Programs delivered inside your facility, following your access and permit procedures.') },
  ]

  const steps = [
    { h: tx('الطلب', 'Request'), p: tx('ترسلون احتياجكم عبر نموذج عرض السعر أو واتساب.', 'Send your needs via the quote form or WhatsApp.') },
    { h: tx('اجتماع تعريفي', 'Discovery meeting'), p: tx('نجتمع مع فريقكم لفهم الأهداف ومستوى المتدربين.', 'We meet your team to understand goals and trainee level.') },
    { h: tx('عرض فني ومالي', 'Proposal & quote'), p: tx('نرسل محاور البرنامج والجدول وعرض السعر الرسمي.', 'We send the program outline, schedule and an official quote.') },
    { h: tx('التنفيذ والتقرير', 'Delivery & report'), p: tx('ننفّذ البرنامج ونسلّم الشهادات وتقريرًا ختاميًا بالمخرجات.', 'We deliver, issue certificates and hand over a final outcomes report.') },
  ]

  const credentials = ar
    ? [
        ['الكيان القانوني', 'شركة بايونيرز هيلث ريسيرتش كونسالتينج (ذات مسؤولية محدودة)'],
        ['الرقم الموحّد للمنشأة', '7055175363'],
        ['ترخيص وزارة الاستثمار', '24926274626'],
        ['الرقم الضريبي', '3150160068'],
        ['العنوان الوطني', 'JHJA8230 — جدة'],
        ['الشهادات', 'شهادات إلكترونية موثّقة قابلة للتحقق عبر رمز QR'],
      ]
    : [
        ['Legal entity', 'Pioneers Health Research Consulting (LLC)'],
        ['Unified establishment no.', '7055175363'],
        ['Ministry of Investment license', '24926274626'],
        ['Tax number', '3150160068'],
        ['National address', 'JHJA8230 — Jeddah'],
        ['Certificates', 'Digitally verifiable certificates via QR code'],
      ]

  const waText = encodeURIComponent(tx('مرحبًا، أتواصل نيابة عن جهة وأرغب في الاستفسار عن برامجكم للمؤسسات.', 'Hello, I’m reaching out on behalf of an organization about your institutional programs.'))
  const quoteLink = '/quote?for=institution'

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-navy to-[#14335c] px-4 py-16 text-white md:px-16 md:py-24">
        <div className="pointer-events-none absolute -top-24 h-80 w-80 rounded-full bg-gold/15 blur-[110px] ltr:right-0 rtl:left-0" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-3 text-[13px] font-semibold tracking-[2px] text-gold">{tx('للمؤسسات والجهات', 'FOR ORGANIZATIONS')}</div>
          <h1 className="font-heading mb-5 text-[30px] font-bold leading-tight md:text-[44px]">
            {tx('نطوّر القدرات البحثية لفرقكم الصحية', 'We build the research capacity of your health teams')}
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-[15.5px] leading-8 text-white/75">
            {tx(
              'برامج تدريب واستشارات في البحث العلمي الصحي، مصمّمة للمستشفيات ومراكز الأبحاث والجامعات ومراكز التدريب في المملكة، وتُقدَّم حضوريًا أو عن بُعد.',
              'Health-research training and consulting designed for hospitals, research centers, universities and training centers in Saudi Arabia — delivered on-site or remotely.',
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to={quoteLink} className="rounded-full bg-gold px-7 py-3 text-[15px] font-bold text-navy no-underline shadow-[0_10px_24px_-12px_rgba(201,162,75,0.9)]">
              {tx('اطلب عرض سعر لجهتك', 'Request a quote for your organization')}
            </Link>
            {wa && (
              <a href={`https://wa.me/${wa}?text=${waText}`} target="_blank" rel="noreferrer" className="rounded-full border border-white/40 px-7 py-3 text-[15px] font-bold text-white no-underline hover:border-white">
                {tx('تواصل عبر واتساب', 'Chat on WhatsApp')}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Who we work with */}
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-20">
        <Reveal>
          <h2 className="font-heading mb-10 text-center text-2xl font-bold text-navy md:text-[30px]">{tx('مع من نعمل', 'Who we work with')}</h2>
        </Reveal>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((a) => (
            <Reveal key={a.h} className="rounded-2xl border border-border bg-white p-6 text-center shadow-[0_10px_30px_-20px_rgba(11,31,58,0.35)]">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-[26px]">{a.icon}</div>
              <h3 className="mb-2 text-[16px] font-bold text-navy">{a.h}</h3>
              <p className="text-[13.5px] leading-7 text-muted">{a.p}</p>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Offerings */}
      <div className="bg-bg-soft px-4 py-14 md:px-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="font-heading mb-3 text-center text-2xl font-bold text-navy md:text-[30px]">{tx('ماذا نقدّم للجهات', 'What we offer organizations')}</h2>
            <p className="mx-auto mb-10 max-w-2xl text-center text-[15px] leading-8 text-muted">
              {tx('نماذج تعاون مرنة تناسب حجم جهتكم وطبيعة احتياجها.', 'Flexible engagement models that fit your organization’s size and needs.')}
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {offerings.map((o) => (
              <Reveal key={o.h} className="flex gap-4 rounded-2xl border border-border bg-white p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-[22px]">{o.icon}</div>
                <div>
                  <h3 className="mb-1.5 text-[17px] font-bold text-navy">{o.h}</h3>
                  <p className="text-[14px] leading-7 text-muted-2">{o.p}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* Program packages (owner-editable) */}
      {packages.length > 0 && (
        <div id="packages" className="mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-20">
          <Reveal>
            <div className="mb-3 text-center text-[13px] font-semibold tracking-[2px] text-accent">{tx('الباقات', 'PACKAGES')}</div>
            <h2 className="font-heading mb-3 text-center text-2xl font-bold text-navy md:text-[30px]">{tx('باقات البرامج المؤسسية', 'Institutional program packages')}</h2>
            <p className="mx-auto mb-10 max-w-2xl text-center text-[15px] leading-8 text-muted">
              {tx('نماذج جاهزة تساعدكم على تحديد حجم التعاون، ويمكن تخصيص أي باقة بالكامل حسب احتياج جهتكم.', 'Ready-made formats to help you scope the engagement — any package can be fully tailored to your needs.')}
            </p>
          </Reveal>
          <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${packages.length >= 4 ? 'lg:grid-cols-4' : packages.length === 3 ? 'lg:grid-cols-3' : ''}`}>
            {packages.map((p, i) => (
              <Reveal
                key={p.id}
                className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white ${p.featured ? 'border-gold shadow-[0_18px_40px_-22px_rgba(201,162,75,0.75)]' : 'border-border shadow-[0_10px_30px_-22px_rgba(11,31,58,0.35)]'}`}
              >
                <PackageHeader p={p} index={i} ar={ar} tx={tx} />
                <div className="flex flex-1 flex-col p-5">
                  <p className="mb-4 border-b border-border pb-4 text-[13.5px] leading-7 text-muted">{pkgText(p, 'audience', ar)}</p>
                  <ul className="mb-5 flex flex-1 flex-col gap-2.5">
                    {featureLines(pkgText(p, 'features', ar))
                      .slice(0, 4)
                      .map((f) => (
                        <CheckItem key={f}>{f}</CheckItem>
                      ))}
                  </ul>
                  <PriceBox p={p} ar={ar} tx={tx} />
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenPkg(p)}
                      className="rounded-lg border border-navy py-2.5 text-center text-[14px] font-bold text-navy transition-colors hover:bg-navy hover:text-white"
                    >
                      {tx('تفاصيل الباقة', 'Package details')}
                    </button>
                    <Link
                      to={`${quoteLink}&package=${encodeURIComponent(p.id)}`}
                      className={`rounded-lg py-2.5 text-center text-[14px] font-bold no-underline transition-colors ${p.featured ? 'bg-gold text-navy hover:bg-gold/85' : 'bg-navy text-white hover:bg-navy-hover'}`}
                    >
                      {tx('اطلب عرض سعر', 'Request a quote')}
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-center text-[12.5px] leading-6 text-muted">
            {tx('تصدر عروض الأسعار بشكل رسمي باسم الجهة، وتشمل محاور البرنامج والجدول الزمني وآلية التقييم.', 'Quotes are issued formally in your organization’s name, including program outline, schedule and assessment method.')}
          </p>
        </div>
      )}
      {openPkg && (
        <DetailsDialog
          index={packages.findIndex((x) => x.id === openPkg.id)}
          title={pkgText(openPkg, 'name', ar)}
          subtitle={pkgText(openPkg, 'audience', ar)}
          badge={openPkg.featured ? tx('الأكثر طلبًا', 'Most requested') : undefined}
          facts={[
            { k: tx('المدة', 'Duration'), v: pkgText(openPkg, 'duration', ar) },
            { k: tx('طريقة التقديم', 'Delivery'), v: pkgText(openPkg, 'format', ar) },
            { k: tx('عدد المتدربين', 'Group size'), v: pkgText(openPkg, 'capacity', ar) },
            {
              k: tx('التسعير', 'Pricing'),
              v: openPkg.price_from
                ? (
                    <>
                      {tx('ابتداءً من', 'Starting from')} <Price cents={openPkg.price_from * 100} locale={ar ? 'ar-SA' : 'en-US'} />
                    </>
                  )
                : tx('حسب احتياج الجهة', 'Tailored'),
            },
          ]}
          overviewLabel={tx('نبذة عن الباقة', 'OVERVIEW')}
          description={pkgText(openPkg, 'description', ar)}
          blocks={[
            { icon: '📚', title: tx('ما يشمله البرنامج', 'What’s included'), text: pkgText(openPkg, 'features', ar) },
            { icon: '📦', title: tx('المخرجات والتسليمات', 'Deliverables'), text: pkgText(openPkg, 'deliverables', ar) },
            { icon: '🤝', title: tx('التزاماتنا', 'Our commitments'), text: pkgText(openPkg, 'our_commitments', ar), tone: 'navy' },
            { icon: '🏥', title: tx('التزامات الجهة', 'Your commitments'), text: pkgText(openPkg, 'client_commitments', ar), tone: 'navy' },
            { icon: '📄', title: tx('الشروط والأحكام', 'Terms & conditions'), text: pkgText(openPkg, 'terms', ar), tone: 'gold', wide: true },
          ]}
          footerText={tx('يمكن تخصيص الباقة بالكامل حسب احتياجكم.', 'This package can be fully tailored to your needs.')}
          cta={{ label: tx('اطلب عرض سعر لهذه الباقة', 'Request a quote for this package'), to: `${quoteLink}&package=${encodeURIComponent(openPkg.id)}` }}
          onClose={() => setOpenPkg(null)}
        />
      )}

      {/* Health sector track */}
      <div id="health" className="mx-auto max-w-6xl border-t border-border px-4 py-14 md:px-8 md:py-20">
        <Reveal>
          <div className="mb-3 text-center text-[13px] font-semibold tracking-[2px] text-accent">{tx('القطاع الصحي', 'HEALTH SECTOR')}</div>
          <h2 className="font-heading mb-3 text-center text-2xl font-bold text-navy md:text-[30px]">{tx('برامج البحث الطبي', 'Medical research programs')}</h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-[15px] leading-8 text-muted">
            {tx('محاور مصمّمة للأطباء والممارسين الصحيين وفرق البحث في المستشفيات ومراكز الأبحاث الطبية.', 'Tracks designed for physicians, health practitioners and research teams in hospitals and medical research centers.')}
          </p>
        </Reveal>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_1fr]">
          <Reveal className="rounded-2xl border border-border bg-white p-6 md:p-7">
            <h3 className="mb-4 text-[17px] font-bold text-navy">{tx('أبرز المحاور', 'Key topics')}</h3>
            <ul className="flex flex-col gap-2.5">
              {healthTopics.map((topic) => (
                <li key={topic} className="flex items-start gap-2.5 text-[14.5px] leading-7 text-muted-2">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <div className="flex flex-col gap-4">
            {healthNotes.map((n) => (
              <Reveal key={n.h} className="rounded-2xl bg-navy/[0.04] p-5">
                <h4 className="mb-1 text-[15.5px] font-bold text-navy">{n.h}</h4>
                <p className="text-[13.5px] leading-7 text-muted">{n.p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* How we work */}
      <div className="bg-bg-soft px-4 py-14 md:px-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="font-heading mb-10 text-center text-2xl font-bold text-navy md:text-[30px]">{tx('كيف نعمل معكم', 'How we work with you')}</h2>
          </Reveal>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={s.h} className="rounded-2xl border border-border bg-white p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gold text-[16px] font-bold text-navy">{i + 1}</div>
                <h3 className="mb-1.5 text-[16px] font-bold text-navy">{s.h}</h3>
                <p className="text-[13.5px] leading-7 text-muted">{s.p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* Official credentials */}
      <div className="mx-auto max-w-5xl px-4 py-14 md:px-8 md:py-20">
        <Reveal className="overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-[#14335c] p-7 text-white md:p-9">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c9a24b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <div>
              <div className="font-heading text-[20px] font-bold">{tx('بيانات الجهة الرسمية', 'Official company details')}</div>
              <div className="text-[13px] text-white/65">{tx('لاستخدامها في إجراءات التعاقد وتسجيل الموردين', 'For contracting and vendor-registration procedures')}</div>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {credentials.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/[0.06] px-4 py-3">
                <dt className="text-[12px] text-white/55">{k}</dt>
                <dd className="mt-0.5 text-[14.5px] font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>

      {/* Final CTA */}
      <div className="border-t border-border px-4 py-14 text-center md:px-16">
        <h2 className="font-heading mb-3 text-[24px] font-bold text-navy md:text-[28px]">{tx('لنبدأ بورشة تجريبية لفريقكم', 'Start with a pilot workshop for your team')}</h2>
        <p className="mx-auto mb-6 max-w-xl text-[15px] leading-8 text-muted">
          {tx('أرسلوا احتياجكم ونعود إليكم بمقترح برنامج وعرض سعر رسمي خلال أيام عمل قليلة.', 'Send us your needs and we’ll return a program proposal and official quote within a few business days.')}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to={quoteLink} className="rounded-full bg-gold px-7 py-3 text-[15px] font-bold text-navy no-underline">
            {tx('اطلب عرض سعر', 'Request a quote')}
          </Link>
          <Link to="/register-institution" className="rounded-full border border-navy px-7 py-3 text-[15px] font-bold text-navy no-underline">
            {tx('سجّل جهتك في المنصة', 'Register your organization')}
          </Link>
        </div>
      </div>
    </div>
  )
}
