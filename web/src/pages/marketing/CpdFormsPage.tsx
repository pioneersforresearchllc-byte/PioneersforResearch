import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useLanguage } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/useDocumentMeta'
import { PageHero } from '@/components/PageHero'
import { EVAL_ASPECTS } from '@/lib/cpdActivity'
import { demoLinks } from '@/lib/cpdDemo'
import { SPEAKER_REVIEW_THRESHOLD } from '@/components/cpd/CpdReviewSections'

/** /cpd/forms — every form used in CPD activities, readable without signing
 *  in and printable (or "Save as PDF") for the SCFHS file. Each form links to
 *  its live electronic version inside the platform (on the demo activity). */
export function CpdFormsPage() {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const tx = (a: string, e: string) => (ar ? a : e)
  useDocumentMeta(
    tx('نماذج التقييم والإفصاح والحضور | الرواد الاستشارية للتدريب والأبحاث', 'CPD forms | Pioneers Consulting for Training and Research'),
    tx(
      'النماذج المستخدمة في أنشطة التعليم المستمر: تقييم النشاط، وتقييم المتحدث، والإفصاح وتضارب المصالح، وسجل الحضور، والاختبار.',
      'Forms used in CPD activities: activity evaluation, speaker evaluation, disclosure and conflict of interest, attendance record and assessment.',
    ),
  )

  const scale = [1, 2, 3, 4, 5]
  const cell = 'border border-border p-2'
  const blank = <span className="inline-block min-w-[140px] border-b border-dotted border-muted-2">&nbsp;</span>

  const toc: [string, string][] = [
    ['activity', tx('1. نموذج تقييم النشاط (يشمل الرضا عن المنصة)', '1. Activity evaluation (incl. LMS satisfaction)')],
    ['speaker', tx('2. نموذج تقييم المتحدث', '2. Speaker evaluation')],
    ['disclosure', tx('3. نموذج الإفصاح عن العلاقات المالية وتضارب المصالح', '3. Financial disclosure & conflict of interest')],
    ['attendance', tx('4. سجل الحضور', '4. Attendance record')],
    ['assessment', tx('5. نموذج الاختبار', '5. Assessment')],
  ]

  return (
    <div>
      <div className="print:hidden">
        <PageHero
          eyebrow={tx('التطوير المهني المستمر', 'Continuing Professional Development')}
          title={tx('نماذج التقييم والإفصاح والحضور', 'Evaluation, disclosure & attendance forms')}
          subtitle={tx(
            'النماذج المعتمدة في أنشطة التعليم المستمر. تُعبّأ إلكترونيًا داخل المنصة، ويمكن عرضها هنا وطباعتها أو حفظها PDF.',
            'The forms used in CPD activities. They are filled in electronically inside the platform, and can be viewed, printed or saved as PDF here.',
          )}
        />
      </div>

      {/* print-area: the global print stylesheet (index.css) hides everything
          outside it, so without this class "Print / save PDF" gave a blank page. */}
      <div className="print-area mx-auto max-w-4xl px-4 py-10 md:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-2 bg-bg-soft p-4 print:hidden">
          <ul className="flex flex-col gap-1 text-[13.5px]">
            {toc.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="font-semibold text-navy underline decoration-gold/60 underline-offset-4">{label}</a>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            <button onClick={() => window.print()} className="rounded-full bg-navy px-5 py-2.5 text-[13.5px] font-bold text-white">
              {tx('طباعة / حفظ PDF', 'Print / save PDF')}
            </button>
            <Link to="/cpd" className="text-center text-[12.5px] text-muted no-underline">{tx('العودة إلى صفحة التعليم المستمر', 'Back to the CPD page')}</Link>
          </div>
        </div>

        {/* 1. Activity evaluation */}
        <Form id="activity" title={toc[0][1]} live={demoLinks.evaluation} tx={tx}>
          <Meta blank={blank} fields={[tx('عنوان النشاط', 'Activity'), tx('التاريخ', 'Date')]} />
          <p className="mb-2 text-[13px] text-muted">{tx('1 = غير موافق بشدة · 5 = موافق بشدة', '1 = strongly disagree · 5 = strongly agree')}</p>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-bg-soft">
                <th className={`${cell} text-start`}>{tx('البند', 'Item')}</th>
                {scale.map((n) => <th key={n} className={`${cell} w-10 text-center`}>{n}</th>)}
              </tr>
            </thead>
            <tbody>
              {EVAL_ASPECTS.map((a) => (
                <tr key={a.key}>
                  <td className={cell}>{ar ? a.ar : a.en}</td>
                  {scale.map((n) => <td key={n} className={`${cell} text-center text-faint`}>○</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[13px]">{tx('هل توصي زملاءك بهذا النشاط؟  ○ نعم   ○ لا', 'Would you recommend this activity?  ○ Yes   ○ No')}</p>
          <p className="mt-2 text-[13px]">{tx('ملاحظات ومقترحات للتحسين (بما فيها موضوعات لأنشطة قادمة):', 'Comments and suggestions (incl. topics for future activities):')}</p>
          <div className="mt-1 h-20 rounded border border-dashed border-border" />
          <Note>{tx('إلزامي لإصدار الشهادة. تُحلَّل النتائج مجمّعة ودون أسماء، وتُستخدم لحساب مؤشر الرضا عن المنصة وتحسين الأنشطة.', 'Required for the certificate. Results are analysed in aggregate and anonymously, and feed the LMS-satisfaction indicator and activity improvement.')}</Note>
        </Form>

        {/* 2. Speaker evaluation */}
        <Form id="speaker" title={toc[1][1]} live={demoLinks.evaluation} tx={tx}>
          <Meta blank={blank} fields={[tx('اسم المتحدث', 'Speaker'), tx('عنوان النشاط / الجلسة', 'Activity / session')]} />
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-bg-soft">
                <th className={`${cell} text-start`}>{tx('البند', 'Item')}</th>
                {scale.map((n) => <th key={n} className={`${cell} w-10 text-center`}>{n}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                tx('المعرفة العلمية وحداثة المحتوى المبني على الدليل', 'Scientific knowledge and up-to-date, evidence-based content'),
                tx('أسلوب العرض ووضوحه والتفاعل مع المتدربين', 'Delivery, clarity and interaction with learners'),
              ].map((l) => (
                <tr key={l}>
                  <td className={cell}>{l}</td>
                  {scale.map((n) => <td key={n} className={`${cell} text-center text-faint`}>○</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[13px]">{tx('ملاحظات عن المتحدث:', 'Notes about the speaker:')}</p>
          <div className="mt-1 h-14 rounded border border-dashed border-border" />
          <Note>
            {tx(
              `يُحسب متوسط كل متحدث آليًا. ${SPEAKER_REVIEW_THRESHOLD} من 5 فأكثر: يبقى في قائمة المتحدثين المعتمدين؛ أقل من ذلك: يُحال إلى اللجنة العلمية للتغذية الراجعة ومراجعة المحتوى أو الاستبعاد، وتُحدَّث قائمة المتحدثين بعد كل نشاط.`,
              `Each speaker’s average is computed automatically. ${SPEAKER_REVIEW_THRESHOLD}/5 or above: stays on the approved list; below: referred to the scientific committee for feedback, content review or exclusion. The speakers list is updated after every activity.`,
            )}
          </Note>
        </Form>

        {/* 3. Disclosure / COI */}
        <Form id="disclosure" title={toc[2][1]} live={demoLinks.activity} liveLabel={tx('إفصاحات المتحدثين المعروضة في صفحة النشاط', 'Speaker disclosures shown on the activity page')} tx={tx}>
          <p className="mb-3 text-[13px] leading-7 text-muted-2">
            {tx(
              'يعبّئه كل من يتحكم في محتوى النشاط (المتحدثون والمدرّبون وأعضاء اللجنة العلمية ومخططو النشاط) قبل النشاط، ويُعرض ملخص إفصاح كل متحدث للمتدربين في صفحة النشاط وفي بداية الجلسة.',
              'Completed before the activity by everyone who controls content (speakers, trainers, scientific committee members and planners). Each speaker’s disclosure summary is shown to learners on the activity page and at the start of the session.',
            )}
          </p>
          <Meta
            blank={blank}
            fields={[
              tx('الاسم', 'Name'),
              tx('الدور في النشاط (متحدث / عضو لجنة / مخطط)', 'Role (speaker / committee / planner)'),
              tx('عنوان النشاط وتاريخه', 'Activity and date'),
              tx('رقم التسجيل في الهيئة (إن وجد)', 'SCFHS registration no. (if any)'),
            ]}
          />
          <p className="mb-2 text-[13px] font-semibold text-navy">
            {tx('أ) خلال الـ 24 شهرًا الماضية، هل لديك (أو لزوجك) علاقة مالية بأي جهة تجارية تنتج أو تسوّق أو تبيع منتجات أو خدمات صحية؟', 'A) In the past 24 months, have you (or your spouse) had a financial relationship with any company that produces, markets or sells healthcare products or services?')}
          </p>
          <p className="mb-2 text-[13px]">{tx('○ لا توجد لديّ أي علاقة مالية ذات صلة بأي جهة تجارية.     ○ نعم، وهي كالتالي:', '○ I have no relevant financial relationship with any commercial interest.     ○ Yes, as follows:')}</p>
          <table className="mb-3 w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="bg-bg-soft">
                <th className={`${cell} text-start`}>{tx('اسم الجهة', 'Company')}</th>
                <th className={`${cell} text-start`}>{tx('طبيعة العلاقة (استشاري، متحدث، منحة بحثية، أسهم، موظف…)', 'Nature (consultant, speaker, research grant, shares, employee…)')}</th>
                <th className={`${cell} text-start`}>{tx('قائمة / منتهية', 'Current / ended')}</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map((i) => (
                <tr key={i}>
                  <td className={`${cell} h-8`} />
                  <td className={cell} />
                  <td className={cell} />
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mb-1 text-[13px] font-semibold text-navy">{tx('ب) أتعهد بما يلي:', 'B) I undertake to:')}</p>
          <ul className="mb-3 list-disc ps-5 text-[13px] leading-7">
            <li>{tx('تقديم محتوى علمي متوازن مبني على أحدث الأدلة، دون ترويج لأي منتج أو جهة.', 'Present balanced, evidence-based content without promoting any product or company.')}</li>
            <li>{tx('استخدام الأسماء العلمية للأدوية والأجهزة، وإن ذُكرت أسماء تجارية فتُذكر لعدة جهات.', 'Use generic names; if trade names are needed, name several manufacturers.')}</li>
            <li>{tx('عرض إفصاحي على المتدربين في بداية النشاط، وإبلاغ إدارة التعليم المستمر بأي تغيير فيه.', 'Show my disclosure to learners at the start and notify CPD management of any change.')}</li>
          </ul>
          <p className="mb-1 text-[13px] font-semibold text-navy">{tx('ج) خاص باللجنة العلمية — معالجة تضارب المصالح:', 'C) Scientific committee — conflict-of-interest resolution:')}</p>
          <p className="mb-3 text-[13px] leading-7">
            {tx('○ لا يوجد تضارب   ○ مراجعة المحتوى من عضو مستقل   ○ تعديل دور الشخص في النشاط   ○ الاستبعاد من النشاط', '○ No conflict   ○ Independent content review   ○ Change of role   ○ Exclusion from the activity')}
          </p>
          <Meta blank={blank} fields={[tx('التوقيع', 'Signature'), tx('التاريخ', 'Date'), tx('اعتماد رئيس اللجنة العلمية', 'Committee chair approval')]} />
          <Note>
            {tx('وفق ', 'Per the ')}
            <Link to="/disclosure-policy" className="text-navy underline">{tx('سياسة الإفصاح وتضارب المصالح والرعاية التجارية', 'disclosure, conflict-of-interest & commercial support policy')}</Link>
            {tx('. تُدخل الإفصاحات في بيانات النشاط داخل المنصة وتظهر في صفحته العامة، وتُحفظ النماذج الموقعة خمس سنوات.', '. Disclosures are entered in the activity data and shown on its public page; signed forms are kept five years.')}
          </Note>
        </Form>

        {/* 4. Attendance record */}
        <Form id="attendance" title={toc[3][1]} live={demoLinks.checkin} liveLabel={tx('رابط تسجيل الحضور المباشر', 'Direct check-in link')} tx={tx}>
          <Meta blank={blank} fields={[tx('عنوان النشاط', 'Activity'), tx('الجلسة', 'Session'), tx('التاريخ والوقت', 'Date & time')]} />
          <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[12.5px] print:min-w-0">
            <thead>
              <tr className="bg-bg-soft">
                <th className={`${cell} w-8`}>#</th>
                <th className={`${cell} text-start`}>{tx('اسم المتدرب', 'Learner')}</th>
                <th className={`${cell} text-start`}>{tx('رقم التسجيل في الهيئة', 'SCFHS no.')}</th>
                <th className={`${cell} text-start`}>{tx('المهنة', 'Profession')}</th>
                <th className={`${cell} text-start`}>{tx('طريقة التسجيل (رابط / QR / يدوي)', 'Method (link / QR / manual)')}</th>
                <th className={`${cell} text-start`}>{tx('الوقت', 'Time')}</th>
                <th className={`${cell} text-start`}>{tx('الحالة', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map((i) => (
                <tr key={i}>
                  <td className={`${cell} h-8 text-center`}>{i}</td>
                  {[0, 1, 2, 3, 4, 5].map((j) => <td key={j} className={cell} />)}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <Note>
            {tx(
              'يُنشأ السجل إلكترونيًا داخل المنصة: تسجيل ذاتي برابط أو QR من 30 دقيقة قبل الجلسة حتى 4 ساعات بعد بدايتها، أو رصد يدوي من المحاضر/المنسق، ويُصدَّر بصيغة CSV مع رقم التسجيل في الهيئة.',
              'The record is created electronically: self check-in by link or QR from 30 min before to 4 h after start, or manual marking by the lecturer/coordinator; exported as CSV with SCFHS numbers.',
            )}
          </Note>
        </Form>

        {/* 5. Assessment */}
        <Form id="assessment" title={toc[4][1]} live={demoLinks.quiz} tx={tx}>
          <ul className="mb-3 list-disc ps-5 text-[13px] leading-7">
            <li>{tx('أسئلة اختيار من متعدد مرتبطة مباشرة بالأهداف التعليمية للنشاط، تعدّها اللجنة العلمية مع المتحدث.', 'Multiple-choice questions mapped to the activity’s objectives, prepared by the committee with the speaker.')}</li>
            <li>{tx('نسبة النجاح معلنة في صفحة النشاط (مثال: 70%)، والتصحيح آلي داخل المنصة، ولا تُرسل الإجابات الصحيحة إلى المتصفح.', 'Pass mark stated on the activity page (e.g. 70%); auto-graded in the platform; correct answers never reach the browser.')}</li>
            <li>{tx('تُحفظ كل محاولة بدرجتها، وتُحلَّل النتائج في تقرير النشاط لقياس تحقق الأهداف.', 'Every attempt is stored with its score; results are analysed in the activity report against the objectives.')}</li>
          </ul>
          <div className="rounded-lg border border-border p-3 text-[13px]">
            <div className="mb-1 font-semibold">{tx('مثال: ما أول خطوة في الممارسة المبنية على الدليل؟', 'Example: what is the first step of evidence-based practice?')}</div>
            <div>○ {tx('صياغة سؤال سريري قابل للبحث', 'Asking an answerable clinical question')}</div>
            <div>○ {tx('نشر النتائج', 'Publishing results')}</div>
            <div>○ {tx('كتابة التوصيات', 'Writing recommendations')}</div>
          </div>
        </Form>
      </div>
    </div>
  )
}

function Form({
  id,
  title,
  live,
  liveLabel,
  tx,
  children,
}: {
  id: string
  title: string
  live: string
  liveLabel?: string
  tx: (a: string, e: string) => string
  children: ReactNode
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-24 rounded-2xl border border-border bg-white p-5 break-inside-avoid md:p-7 print:mb-6 print:break-after-page print:border-0 print:p-0">
      <div className="mb-1 text-[11.5px] text-muted">{tx('الرواد الاستشارية للتدريب والأبحاث — إدارة التعليم المستمر', 'Pioneers Consulting for Training and Research — CPD department')}</div>
      <h2 className="font-heading mb-4 text-[19px] font-bold text-navy">{title}</h2>
      {children}
      <Link
        to={live}
        className="mt-4 inline-block rounded-full border border-navy px-4 py-1.5 text-[12.5px] font-semibold text-navy no-underline hover:bg-bg-soft print:hidden"
      >
        {liveLabel ?? tx('افتح النموذج الإلكتروني داخل المنصة ↗', 'Open the live form in the platform ↗')}
      </Link>
    </section>
  )
}

function Meta({ fields, blank }: { fields: string[]; blank: ReactNode }) {
  return (
    <div className="mb-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f}>
          {f}: {blank}
        </div>
      ))}
    </div>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <p className="mt-3 rounded-md bg-bg-soft px-3 py-2 text-[12.5px] leading-6 text-muted-2">{children}</p>
}
