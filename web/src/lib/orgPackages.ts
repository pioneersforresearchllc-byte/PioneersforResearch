import { saveSiteContent, type ContentMap } from '@/lib/content'

/**
 * Program packages shown on the public /institutions page. Owner-editable from
 * Owner → Institutions; stored as one JSON array in site_content (value_en of
 * ORG_PACKAGES_KEY) so it needs no migration. Until the owner saves, the
 * built-in DEFAULT_ORG_PACKAGES are shown.
 *
 * Multi-line fields hold one item per line (rendered as a list).
 */
export type OrgPackage = {
  id: string
  name_ar: string
  name_en: string
  duration_ar: string
  duration_en: string
  /** One-line "who it's for" shown on the card. */
  audience_ar: string
  audience_en: string
  /** Overview paragraph shown in the details window. */
  description_ar: string
  description_en: string
  format_ar: string
  format_en: string
  capacity_ar: string
  capacity_en: string
  /** Lines: what the program covers (first 4 shown on the card). */
  features_ar: string
  features_en: string
  /** Lines: what the organization receives. */
  deliverables_ar: string
  deliverables_en: string
  /** Lines: what Pioneers commits to. */
  our_commitments_ar: string
  our_commitments_en: string
  /** Lines: what the organization commits to. */
  client_commitments_ar: string
  client_commitments_en: string
  /** Lines: payment, rescheduling and other terms. */
  terms_ar: string
  terms_en: string
  /** "Starting from" price in SAR; null = shown as "tailored pricing". */
  price_from: number | null
  featured: boolean
  active: boolean
}

export const ORG_PACKAGES_KEY = 'institutions.packages'

const EMPTY: Omit<OrgPackage, 'id'> = {
  name_ar: '',
  name_en: '',
  duration_ar: '',
  duration_en: '',
  audience_ar: '',
  audience_en: '',
  description_ar: '',
  description_en: '',
  format_ar: '',
  format_en: '',
  capacity_ar: '',
  capacity_en: '',
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
  price_from: null,
  featured: false,
  active: true,
}

export function newOrgPackage(): OrgPackage {
  return { ...EMPTY, id: `p${Date.now().toString(36)}` }
}

// Shared lines reused by several defaults.
const OUR_BASE_AR = [
  'مدرّبون متخصصون بخلفية أكاديمية وبحثية في المجال الصحي',
  'الالتزام بالمحاور والجدول المتفق عليه في عرض السعر',
  'السرية التامة لبيانات الجهة ومنسوبيها، والاستعداد لتوقيع اتفاقية عدم إفصاح',
  'التدريب على بيانات وأمثلة افتراضية دون استخدام أي بيانات مرضى',
]
const OUR_BASE_EN = [
  'Specialist trainers with academic and health-research backgrounds',
  'Delivery of the topics and schedule agreed in the quote',
  'Full confidentiality of your data and staff; ready to sign an NDA',
  'Training on simulated data and examples — never patient records',
]
const CLIENT_BASE_AR = [
  'تسمية منسّق من الجهة للتواصل والمتابعة',
  'تزويدنا بقائمة المتدربين وتخصصاتهم قبل البدء',
  'توفير القاعة والتجهيزات (شاشة عرض وإنترنت) عند التقديم الحضوري',
  'إصدار تصاريح الدخول اللازمة للمدرّبين عند الحاجة',
]
const CLIENT_BASE_EN = [
  'Name a coordinator for communication and follow-up',
  'Share the trainee list and specialties before the start',
  'Provide the venue and equipment (projector, internet) for on-site delivery',
  'Issue any access permits trainers need',
]
const RESCHEDULE_AR = 'يمكن إعادة جدولة الموعد مرة واحدة بإشعار قبل 7 أيام عمل على الأقل'
const RESCHEDULE_EN = 'One reschedule is allowed with at least 7 business days’ notice'
const QUOTE_AR = 'يصدر عرض سعر رسمي باسم الجهة، ويُعتمد التعاون بعد موافقتها عليه'
const QUOTE_EN = 'A formal quote is issued in your organization’s name; the engagement starts once you approve it'

export const DEFAULT_ORG_PACKAGES: OrgPackage[] = [
  {
    id: 'pilot',
    name_ar: 'ورشة تجريبية',
    name_en: 'Pilot workshop',
    duration_ar: 'يوم واحد (4 – 6 ساعات)',
    duration_en: 'One day (4–6 hours)',
    audience_ar: 'للجهات التي ترغب في تجربة التعاون أولًا',
    audience_en: 'For organizations that want to try us first',
    description_ar:
      'ورشة عملية مركّزة في موضوع بحثي واحد تختاره الجهة، تمنح فريقكم تجربة مباشرة لأسلوبنا في التدريب وتقيس مدى ملاءمته لاحتياجكم قبل الالتزام ببرنامج أطول.',
    description_en:
      'A focused, hands-on workshop on one research topic of your choice — a direct experience of our training approach before committing to a longer program.',
    format_ar: 'حضوري في مقر الجهة أو عن بُعد',
    format_en: 'On-site or remote',
    capacity_ar: 'حتى 30 متدربًا',
    capacity_en: 'Up to 30 trainees',
    features_ar: [
      'موضوع واحد تختاره الجهة (مثل: كتابة الورقة العلمية، أو أساسيات الإحصاء)',
      'شرح نظري مختصر يتبعه تطبيق عملي',
      'نماذج وقوالب جاهزة يحتفظ بها المتدربون',
      'جلسة أسئلة ونقاش مفتوح',
    ].join('\n'),
    features_en: [
      'One topic of your choice (e.g. writing a paper, statistics basics)',
      'Short theory followed by hands-on practice',
      'Ready-to-use templates trainees keep',
      'Open Q&A and discussion',
    ].join('\n'),
    deliverables_ar: ['شهادات حضور إلكترونية موثّقة قابلة للتحقق عبر QR', 'المادة العلمية للورشة', 'تقرير مختصر بالمخرجات والتوصيات للجهة'].join('\n'),
    deliverables_en: ['Digitally verifiable attendance certificates (QR)', 'Workshop materials', 'Short outcomes & recommendations report'].join('\n'),
    our_commitments_ar: OUR_BASE_AR.join('\n'),
    our_commitments_en: OUR_BASE_EN.join('\n'),
    client_commitments_ar: CLIENT_BASE_AR.join('\n'),
    client_commitments_en: CLIENT_BASE_EN.join('\n'),
    terms_ar: [QUOTE_AR, 'يُسدَّد المبلغ كاملًا قبل موعد الورشة', RESCHEDULE_AR, 'يُخصم مبلغ الورشة من قيمة أي برنامج أطول تتعاقد عليه الجهة خلال 60 يومًا'].join('\n'),
    terms_en: [QUOTE_EN, 'Full payment before the workshop date', RESCHEDULE_EN, 'The workshop fee is credited toward any longer program contracted within 60 days'].join('\n'),
    price_from: null,
    featured: false,
    active: true,
  },
  {
    id: 'intensive',
    name_ar: 'برنامج مكثّف',
    name_en: 'Intensive program',
    duration_ar: '3 – 5 أيام',
    duration_en: '3–5 days',
    audience_ar: 'للفرق التي تحتاج إتقان مهارة بحثية محددة',
    audience_en: 'For teams mastering a specific research skill',
    description_ar:
      'برنامج تدريبي مكثّف يبني مهارة بحثية محددة من الأساس حتى التطبيق، بمحاور مصمّمة حسب مستوى المتدربين وأمثلة مأخوذة من بيئة عملهم، مع تقييم يقيس أثر التدريب فعليًا.',
    description_en:
      'An intensive program that builds one research skill from foundations to application, with topics fitted to trainee level, examples from their own setting, and assessment that measures real impact.',
    format_ar: 'حضوري أو عن بُعد أو مدمج',
    format_en: 'On-site, remote or hybrid',
    capacity_ar: 'حتى 25 متدربًا في المجموعة',
    capacity_en: 'Up to 25 trainees per group',
    features_ar: [
      'محاور مصمّمة حسب مستوى المتدربين واحتياج الجهة',
      'تطبيق عملي يومي على أمثلة من بيئة العمل',
      'تقييم قبلي وبعدي لقياس التحسّن',
      'مواد وقوالب وأدوات جاهزة للاستخدام',
      'متابعة بعد البرنامج لمدة أسبوعين للإجابة على الاستفسارات',
    ].join('\n'),
    features_en: [
      'Topics fitted to trainee level and your needs',
      'Daily hands-on practice on cases from your setting',
      'Pre/post assessment to measure improvement',
      'Ready-to-use materials, templates and tools',
      'Two weeks of post-program follow-up for questions',
    ].join('\n'),
    deliverables_ar: [
      'شهادات إتمام إلكترونية موثّقة تتضمن عدد الساعات',
      'المادة العلمية الكاملة للبرنامج',
      'تقرير ختامي يتضمن نتائج التقييم ومستوى كل متدرب',
      'محاور البرنامج وعدد ساعاته لدعم إجراءات اعتماد ساعات التعليم المستمر لدى الجهة',
    ].join('\n'),
    deliverables_en: [
      'Digitally verifiable completion certificates with hours',
      'Full program materials',
      'Final report with assessment results per trainee',
      'Program outline and hours to support your CME/CPD accreditation process',
    ].join('\n'),
    our_commitments_ar: [...OUR_BASE_AR, 'تسليم التقرير الختامي خلال 10 أيام عمل من انتهاء البرنامج'].join('\n'),
    our_commitments_en: [...OUR_BASE_EN, 'Final report within 10 business days of completion'].join('\n'),
    client_commitments_ar: [...CLIENT_BASE_AR, 'ضمان حضور المتدربين وتفرّغهم خلال أيام البرنامج'].join('\n'),
    client_commitments_en: [...CLIENT_BASE_EN, 'Ensure trainees attend and are released for the program days'].join('\n'),
    terms_ar: [QUOTE_AR, 'الدفع: 50% عند التعاقد و50% بعد انتهاء البرنامج', RESCHEDULE_AR].join('\n'),
    terms_en: [QUOTE_EN, 'Payment: 50% on contract, 50% on completion', RESCHEDULE_EN].join('\n'),
    price_from: null,
    featured: true,
    active: true,
  },
  {
    id: 'comprehensive',
    name_ar: 'برنامج متكامل',
    name_en: 'Comprehensive program',
    duration_ar: '4 – 8 أسابيع',
    duration_en: '4–8 weeks',
    audience_ar: 'لتطوير شامل للقدرات البحثية لدى المنسوبين',
    audience_en: 'For end-to-end research capacity building',
    description_ar:
      'برنامج شامل يرافق المتدربين من الفكرة البحثية حتى مسودة جاهزة للنشر، يجمع بين الجلسات التدريبية والإشراف على مشاريع بحثية فعلية، ليخرج كل متدرب أو فريق بمنتج بحثي حقيقي.',
    description_en:
      'A complete program that takes trainees from research idea to a publication-ready draft, combining training sessions with supervision of real research projects so every trainee or team leaves with a tangible output.',
    format_ar: 'حضوري أو عن بُعد أو مدمج (جلسات أسبوعية)',
    format_en: 'On-site, remote or hybrid (weekly sessions)',
    capacity_ar: 'حتى 20 متدربًا أو 6 فرق بحثية',
    capacity_en: 'Up to 20 trainees or 6 research teams',
    features_ar: [
      'صياغة السؤال البحثي ومراجعة الأدبيات',
      'تصميم الدراسة وكتابة المقترح البحثي',
      'متطلبات أخلاقيات البحث وإعداد ملف لجنة المراجعة (IRB)',
      'جمع البيانات وتحليلها إحصائيًا',
      'كتابة الورقة العلمية واختيار المجلة المناسبة',
      'إشراف فردي أو جماعي على مشروع بحثي لكل متدرب أو فريق',
    ].join('\n'),
    features_en: [
      'Framing the research question & literature review',
      'Study design & proposal writing',
      'Research ethics and IRB submission preparation',
      'Data collection and statistical analysis',
      'Writing the paper and choosing the right journal',
      'Individual or group supervision of a project per trainee/team',
    ].join('\n'),
    deliverables_ar: [
      'مقترح بحثي أو مسودة ورقة علمية لكل متدرب أو فريق',
      'شهادات إتمام إلكترونية موثّقة تتضمن عدد الساعات',
      'تقارير دورية للجهة عن تقدّم المتدربين',
      'تقرير ختامي بالمخرجات والتوصيات',
    ].join('\n'),
    deliverables_en: [
      'A research proposal or paper draft per trainee/team',
      'Digitally verifiable completion certificates with hours',
      'Periodic progress reports to the organization',
      'Final outcomes & recommendations report',
    ].join('\n'),
    our_commitments_ar: [...OUR_BASE_AR, 'مشرف بحثي مخصّص لكل مجموعة طوال مدة البرنامج', 'تقرير تقدّم للجهة كل أسبوعين'].join('\n'),
    our_commitments_en: [...OUR_BASE_EN, 'A dedicated research supervisor per group throughout', 'Progress report to the organization every two weeks'].join('\n'),
    client_commitments_ar: [...CLIENT_BASE_AR, 'تخصيص وقت أسبوعي للمتدربين للعمل على مشاريعهم', 'تسهيل إجراءات الموافقات الداخلية للمشاريع البحثية'].join('\n'),
    client_commitments_en: [...CLIENT_BASE_EN, 'Allocate weekly time for trainees to work on their projects', 'Facilitate internal approvals for the research projects'].join('\n'),
    terms_ar: [QUOTE_AR, 'الدفع: 40% عند التعاقد، و30% في منتصف البرنامج، و30% عند الانتهاء', RESCHEDULE_AR, 'النشر العلمي يخضع لقرار المجلات وتحكيمها، ونلتزم بإعداد المسودة وفق معاييرها'].join('\n'),
    terms_en: [QUOTE_EN, 'Payment: 40% on contract, 30% mid-program, 30% on completion', RESCHEDULE_EN, 'Publication is subject to journals’ peer review; we commit to preparing the draft to their standards'].join('\n'),
    price_from: null,
    featured: false,
    active: true,
  },
  {
    id: 'annual',
    name_ar: 'شراكة سنوية',
    name_en: 'Annual partnership',
    duration_ar: '12 شهرًا',
    duration_en: '12 months',
    audience_ar: 'للمستشفيات الكبرى ومراكز التدريب',
    audience_en: 'For major hospitals and training centers',
    description_ar:
      'شراكة استراتيجية على مدار العام نكون فيها الذراع البحثي والتدريبي للجهة: خطة برامج دورية، واستشارات مستمرة لفرق البحث، وتقرير سنوي يقيس الأثر. ولمراكز التدريب: برامج جاهزة يقدّمها المركز تحت مظلته.',
    description_en:
      'A year-round strategic partnership where we act as your research and training arm: a recurring program plan, ongoing consulting for research teams, and an annual impact report. For training centers: ready programs delivered under your umbrella.',
    format_ar: 'حسب الخطة السنوية المتفق عليها',
    format_en: 'Per the agreed annual plan',
    capacity_ar: 'حسب حجم الجهة',
    capacity_en: 'Scaled to your organization',
    features_ar: [
      'خطة برامج سنوية تُبنى مع الجهة في بداية الشراكة',
      'عدد متفق عليه من الورش والبرامج على مدار العام',
      'ساعات استشارات بحثية شهرية لفرق البحث',
      'أولوية في الجدولة ومدير حساب مخصّص',
      'لمراكز التدريب: حق تقديم برامجنا لمتدربي المركز',
    ].join('\n'),
    features_en: [
      'Annual program plan built with you at the start',
      'An agreed number of workshops and programs across the year',
      'Monthly research-consulting hours for research teams',
      'Priority scheduling and a dedicated account manager',
      'For training centers: the right to deliver our programs to your trainees',
    ].join('\n'),
    deliverables_ar: [
      'خطة سنوية مفصّلة',
      'جميع شهادات ومواد البرامج المنفّذة',
      'تقارير ربع سنوية بالمنجزات',
      'تقرير سنوي بالأثر والمخرجات والتوصيات للعام التالي',
    ].join('\n'),
    deliverables_en: [
      'Detailed annual plan',
      'All certificates and materials from delivered programs',
      'Quarterly achievement reports',
      'Annual impact report with recommendations for the next year',
    ].join('\n'),
    our_commitments_ar: [...OUR_BASE_AR, 'مدير حساب مخصّص يرد خلال يوم عمل واحد', 'تنفيذ الخطة السنوية وفق الجدول المعتمد'].join('\n'),
    our_commitments_en: [...OUR_BASE_EN, 'A dedicated account manager replying within one business day', 'Delivery of the annual plan on the approved schedule'].join('\n'),
    client_commitments_ar: [...CLIENT_BASE_AR, 'اعتماد الخطة السنوية في بداية الشراكة', 'مراجعة ربع سنوية مشتركة للخطة'].join('\n'),
    client_commitments_en: [...CLIENT_BASE_EN, 'Approve the annual plan at the start', 'Joint quarterly plan review'].join('\n'),
    terms_ar: [QUOTE_AR, 'عقد سنوي، والدفع على أقساط ربع سنوية مقدّمة', 'يمكن تعديل الخطة بالاتفاق خلال المراجعات الربع سنوية', 'يتجدد العقد باتفاق الطرفين قبل انتهائه بـ 30 يومًا'].join('\n'),
    terms_en: [QUOTE_EN, 'Annual contract, paid in quarterly installments in advance', 'The plan can be adjusted by agreement at quarterly reviews', 'Renewal by mutual agreement 30 days before expiry'].join('\n'),
    price_from: null,
    featured: false,
    active: true,
  },
]

/** The owner's saved packages, or the defaults when none saved / unreadable.
 *  Saved rows are merged over EMPTY so fields added later never come back undefined. */
export function resolveOrgPackages(content: ContentMap | undefined): OrgPackage[] {
  const raw = content?.[ORG_PACKAGES_KEY]?.en
  if (!raw) return DEFAULT_ORG_PACKAGES
  try {
    const parsed = JSON.parse(raw) as Partial<OrgPackage>[]
    if (!Array.isArray(parsed)) return DEFAULT_ORG_PACKAGES
    return parsed.map((p, i) => ({ ...EMPTY, ...p, id: p.id || `p${i}` }))
  } catch {
    return DEFAULT_ORG_PACKAGES
  }
}

export async function saveOrgPackages(list: OrgPackage[]) {
  await saveSiteContent(ORG_PACKAGES_KEY, '', JSON.stringify(list))
}

export function featureLines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

/** Picks the field in the current language, falling back to Arabic. */
export function pkgText(p: OrgPackage, field: 'name' | 'duration' | 'audience' | 'description' | 'format' | 'capacity' | 'features' | 'deliverables' | 'our_commitments' | 'client_commitments' | 'terms', ar: boolean): string {
  const a = p[`${field}_ar`]
  const e = p[`${field}_en`]
  return ar ? a : e || a
}
