import { saveSiteContent, type ContentMap } from '@/lib/content'

/**
 * Details window content for individual services (same structure as the
 * institution packages). Owner-editable from Owner → Services; stored as one
 * JSON object in site_content (value_en of SERVICE_DETAILS_KEY), keyed by
 * service id — no migration. Services with no saved entry fall back to the
 * built-in defaults below (matched by slug), else show no "Details" button.
 * Multi-line fields hold one item per line.
 */
export type ServiceDetails = {
  /** Short overview for the window; empty = the service description is used. */
  overview_ar: string
  overview_en: string
  audience_ar: string
  audience_en: string
  duration_ar: string
  duration_en: string
  format_ar: string
  format_en: string
  features_ar: string
  features_en: string
  deliverables_ar: string
  deliverables_en: string
  our_commitments_ar: string
  our_commitments_en: string
  client_commitments_ar: string
  client_commitments_en: string
  terms_ar: string
  terms_en: string
}

export const SERVICE_DETAILS_KEY = 'services.details'

export const EMPTY_SERVICE_DETAILS: ServiceDetails = {
  overview_ar: '',
  overview_en: '',
  audience_ar: '',
  audience_en: '',
  duration_ar: '',
  duration_en: '',
  format_ar: '',
  format_en: '',
  features_ar: '',
  features_en: '',
  deliverables_ar: '',
  deliverables_en: '',
  our_commitments_ar: '',
  our_commitments_en: '',
  client_commitments_ar: '',
  client_commitments_en: '',
  terms_ar: '',
  terms_en: '',
}

const j = (xs: string[]) => xs.join('\n')

// Lines shared by every individual service (consistent with the site Terms).
const OUR_AR = [
  'مختص في البحث الصحي يتابع طلبك من البداية حتى التسليم',
  'الالتزام بالنطاق والخطة الزمنية المتفق عليها في عرض السعر',
  'جولتان (2) من التعديلات ضمن النطاق خلال 14 يومًا من التسليم',
  'السرية التامة لملفاتك وبياناتك البحثية',
]
const OUR_EN = [
  'A health-research specialist follows your request from start to delivery',
  'Delivery within the scope and timeline agreed in the quote',
  'Two (2) rounds of in-scope revisions within 14 days of delivery',
  'Full confidentiality of your files and research data',
]
const CLIENT_AR = [
  'تزويدنا بكامل المعلومات والملفات المطلوبة في بداية الطلب',
  'الرد على استفساراتنا خلال وقت معقول (تأخير الرد يمدّد مدة التسليم بالقدر نفسه)',
  'إرسال ملاحظاتك وملاحظات مشرفك كتابيًا في جولة واحدة مجمّعة',
  'استخدام المخرجات وفق سياسات النزاهة الأكاديمية في جامعتك أو جهتك',
]
const CLIENT_EN = [
  'Provide all required information and files at the start',
  'Reply to our questions within a reasonable time (delays extend delivery by the same period)',
  'Send your and your supervisor’s remarks in writing, in one consolidated round',
  'Use deliverables in line with your university’s or institution’s academic-integrity policies',
]
const TERMS_AR = [
  'يُدفع المبلغ كاملًا مقدمًا قبل بدء العمل، وتبدأ المدة من اكتمال الدفع واستلام المواد',
  'لا يُسترد المبلغ بعد بدء التنفيذ وفق سياسة الاسترجاع والإلغاء',
  'أي تغيير في الفكرة أو العنوان أو المنهجية أو البيانات بعد البدء يُعدّ عملًا إضافيًا بعرض مستقل',
  'لا نضمن قبول جهتك أو مشرفك أو لجنتك للعمل؛ فهي قرارات مستقلة عنا',
]
const TERMS_EN = [
  'Full payment in advance before work starts; the timeline starts once payment and materials are received',
  'No refund once work has started, per the Refund & Cancellation Policy',
  'Any change of idea, title, methodology or data after starting is additional work, quoted separately',
  'We cannot guarantee acceptance by your institution, supervisor or committee — those are independent decisions',
]

/** Built-in content for the current services, keyed by slug. */
export const DEFAULT_SERVICE_DETAILS: Record<string, ServiceDetails> = {
  presentation: {
    overview_ar: '',
    overview_en: '',
    audience_ar: 'لطلاب الدراسات العليا والباحثين الذين لديهم فكرة أولية',
    audience_en: 'For graduate students and researchers with an initial idea',
    duration_ar: '2 – 4 أسابيع حسب الجاهزية',
    duration_en: '2–4 weeks depending on readiness',
    format_ar: 'عن بُعد: جلسات مباشرة + متابعة',
    format_en: 'Remote: live sessions + follow-up',
    features_ar: j([
      'صياغة السؤال البحثي بإطار علمي (مثل PICO / FINER)',
      'مراجعة الأدبيات وتحديد الفجوة البحثية',
      'صياغة الأهداف والفرضيات',
      'اختيار تصميم الدراسة والمنهجية وحساب حجم العينة',
      'خطة جمع البيانات وتحليلها',
      'كتابة المقترح وفق نموذج جامعتك أو جهتك',
      'جلسات تدريبية تشرح لك كل خطوة لتتقنها بنفسك',
    ]),
    features_en: j([
      'Framing the research question (e.g. PICO / FINER)',
      'Literature review and identifying the research gap',
      'Writing objectives and hypotheses',
      'Choosing study design, methodology and sample size',
      'Data collection and analysis plan',
      'Writing the proposal to your university’s or institution’s template',
      'Training sessions explaining every step so you master it yourself',
    ]),
    deliverables_ar: j(['مقترح بحثي مكتمل بصيغة Word جاهز للتقديم', 'قائمة المراجع منسّقة بالأسلوب المطلوب', 'مصفوفة الأدبيات (Literature Matrix)', 'القوالب والملاحظات المستخدمة في الجلسات']),
    deliverables_en: j(['A complete, submission-ready proposal (Word)', 'Reference list in the required style', 'Literature matrix', 'Templates and notes used in the sessions']),
    our_commitments_ar: j(OUR_AR),
    our_commitments_en: j(OUR_EN),
    client_commitments_ar: j([...CLIENT_AR, 'حضور الجلسات التدريبية في مواعيدها']),
    client_commitments_en: j([...CLIENT_EN, 'Attend the training sessions on time']),
    terms_ar: j(TERMS_AR),
    terms_en: j(TERMS_EN),
  },
  'research-data-analysis': {
    overview_ar: '',
    overview_en: '',
    audience_ar: 'للباحثين الذين جمعوا بياناتهم ويحتاجون تحليلًا إحصائيًا دقيقًا',
    audience_en: 'For researchers who have collected data and need rigorous statistics',
    duration_ar: '5 – 10 أيام عمل حسب حجم البيانات',
    duration_en: '5–10 business days depending on data size',
    format_ar: 'عن بُعد + جلسة شرح للنتائج',
    format_en: 'Remote + a results walkthrough session',
    features_ar: j([
      'مراجعة البيانات وتنظيفها وترميز المتغيرات',
      'اختيار الاختبارات الإحصائية المناسبة لأسئلة بحثك',
      'الإحصاء الوصفي والاستدلالي باستخدام SPSS أو R',
      'جداول ورسوم بيانية بصيغة جاهزة للنشر',
      'تفسير النتائج بلغة واضحة',
      'جلسة لشرح النتائج والإجابة على أسئلتك',
    ]),
    features_en: j([
      'Data review, cleaning and variable coding',
      'Choosing the right statistical tests for your questions',
      'Descriptive and inferential statistics in SPSS or R',
      'Publication-ready tables and figures',
      'Plain-language interpretation of results',
      'A session to walk you through the results and answer questions',
    ]),
    deliverables_ar: j(['ملف النتائج (جداول ورسوم) جاهز للإدراج في بحثك', 'مسودة قسم النتائج (Results)', 'ملف المخرجات الإحصائية الأصلي', 'شرح مكتوب للاختبارات المستخدمة وسبب اختيارها']),
    deliverables_en: j(['Results file (tables and figures) ready for your paper', 'Draft Results section', 'Original statistical output file', 'Written explanation of the tests used and why']),
    our_commitments_ar: j(OUR_AR),
    our_commitments_en: j(OUR_EN),
    client_commitments_ar: j([
      'تزويدنا بالبيانات بصيغة Excel أو SPSS مع دليل المتغيرات',
      'إرسال المقترح أو أسئلة البحث والأهداف',
      'الحصول على الموافقة الأخلاقية اللازمة لجمع البيانات',
      'إزالة أي بيانات تعريفية للمشاركين قبل الإرسال',
      ...CLIENT_AR.slice(1),
    ]),
    client_commitments_en: j([
      'Provide the data in Excel or SPSS format with a variable guide',
      'Send the proposal or research questions and objectives',
      'Hold the ethical approval required to collect the data',
      'Remove participants’ identifying data before sending',
      ...CLIENT_EN.slice(1),
    ]),
    terms_ar: j([
      ...TERMS_AR,
      'النتائج تعكس بياناتك كما هي؛ ولا نعدّل البيانات أو نختار التحليلات بهدف الوصول إلى نتيجة معينة، التزامًا بالنزاهة العلمية',
      'التحليلات الإضافية خارج أسئلة البحث المتفق عليها تُسعَّر بعرض مستقل',
    ]),
    terms_en: j([
      ...TERMS_EN,
      'Results reflect your data as it is; we never alter data or pick analyses to reach a desired result, in line with research integrity',
      'Extra analyses beyond the agreed research questions are quoted separately',
    ]),
  },
  'idea-to-research-proposal-conversion-pac-548ho': {
    overview_ar:
      'باقة متكاملة تجمع خدمتي «تحويل الفكرة إلى مقترح بحثي + تدريب» و«تحليل بيانات البحث»: نرافقك من صياغة الفكرة والمقترح، مرورًا بتصميم أداة جمع البيانات، حتى التحليل الإحصائي وتفسير النتائج، مع تدريب في كل مرحلة.',
    overview_en:
      'A complete bundle combining “Idea to research proposal + training” and “Research data analysis”: from framing the idea and proposal, through designing the data-collection tool, to statistical analysis and interpretation — with training at every stage.',
    audience_ar: 'للباحث الذي يريد رحلة كاملة: من الفكرة حتى النتائج',
    audience_en: 'For researchers who want the full journey: from idea to results',
    duration_ar: '4 – 8 أسابيع حسب الجاهزية وموعد جمع البيانات',
    duration_en: '4–8 weeks depending on readiness and data collection',
    format_ar: 'عن بُعد: جلسات مباشرة + متابعة',
    format_en: 'Remote: live sessions + follow-up',
    features_ar: j([
      'كل ما في خدمة «تحويل الفكرة إلى مقترح بحثي + تدريب»',
      'تصميم أداة جمع البيانات (استبانة أو نموذج استخراج)',
      'التحليل الإحصائي الكامل بعد جمع البيانات',
      'جداول ورسوم جاهزة للنشر وتفسير النتائج',
      'جلسات تدريبية في كل مرحلة',
    ]),
    features_en: j([
      'Everything in “Idea to research proposal + training”',
      'Designing the data-collection tool (questionnaire or extraction form)',
      'Full statistical analysis once data is collected',
      'Publication-ready tables and figures with interpretation',
      'Training sessions at every stage',
    ]),
    deliverables_ar: j(['مقترح بحثي مكتمل جاهز للتقديم', 'أداة جمع البيانات', 'ملف النتائج (جداول ورسوم) ومسودة قسم النتائج', 'ملف المخرجات الإحصائية الأصلي']),
    deliverables_en: j(['A complete, submission-ready proposal', 'The data-collection tool', 'Results file (tables and figures) and a draft Results section', 'Original statistical output file']),
    our_commitments_ar: j(OUR_AR),
    our_commitments_en: j(OUR_EN),
    client_commitments_ar: j([...CLIENT_AR, 'جمع البيانات بنفسك بعد الحصول على الموافقة الأخلاقية', 'حضور الجلسات التدريبية في مواعيدها']),
    client_commitments_en: j([...CLIENT_EN, 'Collect the data yourself after obtaining ethical approval', 'Attend the training sessions on time']),
    terms_ar: j([...TERMS_AR, 'مرحلة التحليل تبدأ بعد استلام البيانات كاملة؛ وتأخر جمع البيانات لا يُعدّ تأخيرًا منا']),
    terms_en: j([...TERMS_EN, 'The analysis phase starts once complete data is received; delays in data collection are not delays on our side']),
  },
  'complete-preparation-and-submission-of-c-z45nq': {
    overview_ar:
      'حل متكامل لإعداد سجلات التجارب السريرية وتسجيلها وتحديثها على ClinicalTrials.gov، وصياغة النتائج ونشرها، ومعالجة ملاحظات مراجعة نظام PRS حتى الاعتماد، بما يضمن الامتثال للمتطلبات الدولية وشروط المجلات العلمية (ICMJE) ولجان الأخلاقيات.',
    overview_en:
      'An end-to-end solution to prepare, register and update clinical-trial records on ClinicalTrials.gov, report results, and resolve PRS review comments until release — ensuring compliance with international requirements, journal (ICMJE) rules and ethics committees.',
    audience_ar: 'للباحثين والمراكز البحثية وشركات الأدوية والمستشفيات الجامعية',
    audience_en: 'For researchers, research centers, pharma companies and university hospitals',
    duration_ar: 'التسجيل الأولي: 5 – 10 أيام عمل',
    duration_en: 'Initial registration: 5–10 business days',
    format_ar: 'عن بُعد عبر نظام PRS',
    format_en: 'Remote via the PRS system',
    features_ar: j([
      'مراجعة البروتوكول واستخراج البيانات المطلوبة للسجل',
      'كتابة الملخصات العامة والعلمية للدراسة',
      'توثيق الأهداف ونقاط النهاية ومعايير الإدماج والاستبعاد',
      'إدخال جميع حقول السجل وتصنيف تصميم الدراسة',
      'إعداد ونشر النتائج (مخطط المشاركين، الخصائص الأساسية، المخرجات، الأحداث العكسية) عند طلبها',
      'معالجة ملاحظات مراجعة PRS وإعادة التقديم حتى الاعتماد',
    ]),
    features_en: j([
      'Reviewing the protocol and extracting the data the record needs',
      'Writing lay and scientific study summaries',
      'Documenting objectives, outcome measures and eligibility criteria',
      'Completing all record fields and classifying the study design',
      'Results reporting (participant flow, baseline, outcomes, adverse events) when requested',
      'Resolving PRS review comments and resubmitting until release',
    ]),
    deliverables_ar: j(['سجل مكتمل ومُرسل للمراجعة في ClinicalTrials.gov', 'ردود رسمية على ملاحظات المراجعة', 'متابعة حتى إصدار رقم التسجيل (NCT)', 'قائمة بالتحديثات الدورية المطلوبة للحفاظ على السجل']),
    deliverables_en: j(['A complete record submitted for review on ClinicalTrials.gov', 'Formal responses to review comments', 'Follow-up until the NCT number is issued', 'A list of the periodic updates needed to keep the record compliant']),
    our_commitments_ar: j(OUR_AR.filter((_, i) => i !== 2)),
    our_commitments_en: j(OUR_EN.filter((_, i) => i !== 2)),
    client_commitments_ar: j([
      'تزويدنا بالبروتوكول النهائي وموافقة لجنة الأخلاقيات',
      'منحنا صلاحية الدخول إلى حساب PRS الخاص بجهتك (أو إنشاء مستخدم لنا)',
      'الرد على أسئلتنا ومراجعة البيانات قبل الإرسال',
      'إبلاغنا بأي تغيير في الدراسة أو حالة التجنيد',
    ]),
    client_commitments_en: j([
      'Provide the final protocol and ethics committee approval',
      'Grant us access to your organization’s PRS account (or create a user for us)',
      'Answer our questions and review the data before submission',
      'Inform us of any change to the study or recruitment status',
    ]),
    terms_ar: j([
      TERMS_AR[0],
      TERMS_AR[1],
      'قرار الاعتماد ومدته يعودان إلى ClinicalTrials.gov، ولا نضمن مدة المراجعة لديهم',
      'تبقى المسؤولية النظامية عن السجل ودقة بياناته على الجهة الراعية أو الباحث الرئيسي (Responsible Party)',
      'الصيانة الدورية والتحديثات السنوية بعد الاعتماد تُسعَّر بعرض مستقل ما لم تُذكر في عرض السعر',
    ]),
    terms_en: j([
      TERMS_EN[0],
      TERMS_EN[1],
      'Approval and its timing are decided by ClinicalTrials.gov; we cannot guarantee their review time',
      'Regulatory responsibility for the record and its accuracy stays with the sponsor or principal investigator (Responsible Party)',
      'Ongoing maintenance and annual updates after release are quoted separately unless included in the quote',
    ]),
  },
}

/** Saved details by service id (empty object when none saved / unreadable). */
export function resolveSavedServiceDetails(content: ContentMap | undefined): Record<string, ServiceDetails> {
  const raw = content?.[SERVICE_DETAILS_KEY]?.en
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, Partial<ServiceDetails>>
    const out: Record<string, ServiceDetails> = {}
    for (const [id, d] of Object.entries(parsed ?? {})) out[id] = { ...EMPTY_SERVICE_DETAILS, ...d }
    return out
  } catch {
    return {}
  }
}

/** Details for one service: saved (by id) → built-in default (by slug) → null. */
export function detailsFor(content: ContentMap | undefined, service: { id: string; slug: string }): ServiceDetails | null {
  return resolveSavedServiceDetails(content)[service.id] ?? DEFAULT_SERVICE_DETAILS[service.slug] ?? null
}

export async function saveServiceDetails(all: Record<string, ServiceDetails>) {
  await saveSiteContent(SERVICE_DETAILS_KEY, '', JSON.stringify(all))
}

export function sdText(d: ServiceDetails, field: 'overview' | 'audience' | 'duration' | 'format' | 'features' | 'deliverables' | 'our_commitments' | 'client_commitments' | 'terms', ar: boolean): string {
  const a = d[`${field}_ar`]
  const e = d[`${field}_en`]
  return ar ? a : e || a
}
