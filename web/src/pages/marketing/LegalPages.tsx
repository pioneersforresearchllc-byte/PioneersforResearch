import { Link } from 'react-router-dom'
import { useLanguage } from '@/lib/i18n'

interface Section {
  h: string
  p: string[]
}
interface Doc {
  title: string
  intro: string
  sections: Section[]
}

const EFFECTIVE = { ar: 'آخر تحديث: سبتمبر 2026', en: 'Last updated: September 2026' }
const EMAIL = 'pioneersforresearchllc@gmail.com'

function LegalDoc({ doc, effective }: { doc: Doc; effective: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8 md:py-16">
      <Link to="/" className="mb-4 inline-block text-[13px] text-muted no-underline">
        → الرئيسية / Home
      </Link>
      <h1 className="font-heading mb-2 text-[26px] font-bold text-navy md:text-[32px]">{doc.title}</h1>
      <div className="mb-6 text-[12.5px] text-faint">{effective}</div>
      <p className="mb-8 text-[15px] leading-8 text-muted-2">{doc.intro}</p>
      <div className="flex flex-col gap-6">
        {doc.sections.map((s, i) => (
          <section key={i}>
            <h2 className="font-heading mb-2 text-[17px] font-bold text-navy">
              {i + 1}. {s.h}
            </h2>
            {s.p.map((para, j) => (
              <p key={j} className="mb-2 text-[14px] leading-7 text-muted-2">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

// ── Terms of Service ──────────────────────────────────────────────────────
const TERMS: Record<'ar' | 'en', Doc> = {
  ar: {
    title: 'شروط الخدمة',
    intro:
      'مرحبًا بك في منصة Pioneers Health Research ("المنصة"، "نحن"). باستخدامك المنصة أو إنشاء حساب أو الاشتراك في أي خدمة، فإنك تقرّ بأنك قرأت هذه الشروط ووافقت على الالتزام بها. تخضع هذه الشروط لأنظمة المملكة العربية السعودية، ولا تُخلّ بأي حقوق يمنحك إياها نظام التجارة الإلكترونية ونظام حماية المستهلك.',
    sections: [
      {
        h: 'هوية مزوّد الخدمة',
        p: [
          'تُدار هذه المنصة من قِبل: بايونيرز للأبحاث الصحية (شركة ذات مسؤولية محدودة).',
          'الرقم الموحّد للمنشأة: 7055175363 — رخصة الاستثمار الأجنبي (وزارة الاستثمار MISA): 24926274626 — الرقم الضريبي: 3150160068 — العنوان الوطني: [يُعبّأ].',
          `للتواصل والشكاوى: ${EMAIL}. المتجر موثّق لدى منصة التوثيق الحكومية (معروف / منصة الأعمال بمركز الأعمال السعودي).`,
        ],
      },
      { h: 'تعريفات', p: ['"المنصة": موقع pioneersresearch.com وما يتصل به من خدمات. "المستخدم/المشترك": كل من ينشئ حسابًا أو يطلب خدمة. "المحتوى": الدورات والمواد والتقارير والاستشارات المقدَّمة عبر المنصة.'] },
      { h: 'الأهلية والحساب', p: ['يجب أن تكون مؤهّلًا قانونيًا لإبرام العقود وأن تقدّم بيانات صحيحة ومحدَّثة.', 'أنت وحدك المسؤول عن سرية بيانات حسابك وكل نشاط يتم من خلاله، وعليك إبلاغنا فورًا بأي استخدام غير مصرّح به.'] },
      { h: 'طبيعة الخدمات', p: ['تقدّم المنصة تدريبًا وإشرافًا وخدمات بحثية ودورات تعليمية ذات طبيعة تعليمية واستشارية. لا نضمن نتيجة معيّنة (كقبول ورقة للنشر أو الحصول على درجة محددة)، وتقع المسؤولية النهائية عن البحث ونزاهته العلمية على المستخدم.'] },
      {
        h: 'الأسعار والدفع (الإفصاح والضريبة)',
        p: [
          'تُعرض جميع الأسعار بالريال السعودي (﷼)، وتُوضَّح التكلفة الكاملة قبل تأكيد الطلب. وفي حال كانت المنشأة مسجَّلة في ضريبة القيمة المضافة، تُبيَّن الضريبة (15%) وتُضاف وفق النظام.',
          'نُصدر فاتورة عند الاقتضاء، وفاتورة ضريبية متى ما انطبق نظام هيئة الزكاة والضريبة والجمارك. قد تُفعَّل بوابات دفع إلكترونية، وقد تتم بعض التسجيلات بالطلب دون دفع فوري وفق تقديرنا.',
        ],
      },
      {
        h: 'الإلغاء والاسترداد وحقوق المستهلك',
        p: [
          'تُطبَّق حقوقك النظامية بموجب نظام التجارة الإلكترونية ونظام حماية المستهلك في المملكة، بما في ذلك حق طلب الإلغاء والاسترداد خلال المدة النظامية المقرّرة، ما لم يكن الطلب من الفئات المستثناة نظامًا.',
          'نظرًا لأن خدماتنا رقمية/تدريبية وتُنفَّذ فور البدء، فإنك بطلبك بدء الخدمة أو تفعيل الوصول إلى المحتوى الرقمي (كالدورات أو أكواد التفعيل) توافق صراحةً على البدء الفوري في التنفيذ، وتُقرّ بأن حق الإلغاء قد لا يسري بعد بدء التنفيذ أو منح الوصول، وذلك ضمن الاستثناءات المنصوص عليها نظامًا.',
          'في غير الفئات المستثناة وقبل بدء التنفيذ، يُعاد المبلغ خلال المدة النظامية وبالوسيلة ذاتها للدفع.',
        ],
      },
      { h: 'الملكية الفكرية', p: ['جميع محتويات المنصة ودوراتها وموادها وعلاماتها التجارية مملوكة لنا أو لمرخّصينا، ويُمنح المستخدم ترخيصًا شخصيًا محدودًا غير قابل للتحويل لاستخدامها لأغراض التعلّم فقط.', 'يُمنع نسخ المحتوى أو إعادة بيعه أو توزيعه أو مشاركة أكواد الوصول. ويحتفظ المستخدم بملكية بياناته والمواد التي يرفعها، ويمنحنا ترخيصًا لاستخدامها بالقدر اللازم لتقديم الخدمة.'] },
      { h: 'الاستخدام المقبول', p: ['يُمنع استخدام المنصة لأي غرض غير مشروع، أو انتهاك حقوق الغير، أو محاولة اختراق أو تعطيل الأنظمة، أو الاستخلاص الآلي للبيانات، أو الانتحال أو التحايل على وسائل الدفع.'] },
      { h: 'المحتوى الذي ينشره المستخدم', p: ['أنت مسؤول عن أي محتوى تنشره (تعليقات، طلبات، ملفات) وعن كونه قانونيًا وغير مسيء، ويحق لنا حذف أي محتوى مخالف.'] },
      { h: 'إخلاء الضمانات', p: ['تُقدَّم المنصة وخدماتها "كما هي" و"حسب توافرها" دون ضمانات صريحة أو ضمنية بما يسمح به النظام، مع عدم الإخلال بحقوقك النظامية كمستهلك.'] },
      { h: 'تحديد المسؤولية', p: ['إلى أقصى حدٍّ يسمح به النظام، لا نتحمّل الأضرار غير المباشرة أو التبعية، ولا تتجاوز مسؤوليتنا الإجمالية قيمة المبلغ الذي دفعته فعليًا مقابل الخدمة محل النزاع خلال الأشهر الثلاثة السابقة. ولا يحدّ هذا البند من أي مسؤولية لا يجوز استبعادها نظامًا.'] },
      { h: 'التعليق والإنهاء', p: ['يحق لنا تعليق حسابك أو إنهاؤه عند مخالفة هذه الشروط، مع الاحتفاظ بحقوقنا الأخرى بموجب النظام.'] },
      { h: 'الخصوصية وحماية البيانات', p: ['يخضع جمع بياناتك ومعالجتها لسياسة الخصوصية، المعدّة وفق نظام حماية البيانات الشخصية (PDPL) في المملكة، وهي جزء لا يتجزأ من هذه الشروط.'] },
      { h: 'الشكاوى', p: ['يمكنك تقديم شكواك إلينا مباشرةً عبر بريد التواصل، ولك الحق في اللجوء إلى وزارة التجارة والجهات المختصة عبر قنواتها الرسمية.'] },
      { h: 'تعديل الشروط', p: ['قد نحدّث هذه الشروط من وقت لآخر، ويسري التحديث فور نشره على المنصة، واستمرارك في الاستخدام يُعدّ قبولًا.'] },
      { h: 'القانون الحاكم والاختصاص القضائي', p: ['تخضع هذه الشروط لأنظمة المملكة العربية السعودية، وتختص الجهات القضائية المختصة في المملكة بأي نزاع ينشأ عنها.'] },
    ],
  },
  en: {
    title: 'Terms of Service',
    intro:
      'Welcome to Pioneers Health Research (the "Platform", "we"). By using the Platform, creating an account, or subscribing to any service, you acknowledge that you have read and agree to these Terms. These Terms are governed by the laws of the Kingdom of Saudi Arabia and do not waive any rights granted to you by the Saudi E-Commerce Law and Consumer Protection Law.',
    sections: [
      {
        h: 'Service provider identity',
        p: [
          'This Platform is operated by: Pioneers for Research LLC.',
          'Unified Establishment Number: 7055175363 — Foreign Investment License (MISA): 24926274626 — Tax Number (ZATCA): 3150160068 — National Address: [to fill].',
          `Contact & complaints: ${EMAIL}. The store is authenticated on the government platform (Maroof / the Business Platform of the Saudi Business Center).`,
        ],
      },
      { h: 'Definitions', p: ['"Platform": pioneersresearch.com and related services. "User/Subscriber": anyone creating an account or requesting a service. "Content": courses, materials, reports, and consultations provided via the Platform.'] },
      { h: 'Eligibility & account', p: ['You must be legally able to contract and provide accurate, current information.', 'You are solely responsible for your account credentials and all activity under it, and must notify us of any unauthorized use.'] },
      { h: 'Nature of the services', p: ['The Platform provides training, mentorship, research services, and educational courses that are educational and advisory in nature. We do not guarantee any specific outcome (e.g., publication or a grade); final responsibility for the research and its integrity rests with the User.'] },
      {
        h: 'Pricing & payment (disclosure & VAT)',
        p: [
          'All prices are shown in Saudi Riyals (﷼), and the full cost is shown before order confirmation. Where the establishment is VAT-registered, VAT (15%) is disclosed and added as required by law.',
          'We issue a tax invoice where required under ZATCA rules. Electronic payment gateways may be enabled, and some registrations may proceed by request without immediate payment at our discretion.',
        ],
      },
      {
        h: 'Cancellation, refund & consumer rights',
        p: [
          'Your statutory rights under the Saudi E-Commerce Law and Consumer Protection Law apply, including the right to cancel and obtain a refund within the statutory period, unless the order falls within a legally excluded category.',
          'Because our services are digital/training and are performed immediately, by requesting the service to begin or activating access to digital content (e.g., courses or activation codes) you expressly consent to immediate performance and acknowledge that the right to cancel may not apply after performance begins or access is granted, within the statutory exceptions.',
          'For non-excluded categories and before performance begins, refunds are made within the statutory period using the same payment method.',
        ],
      },
      { h: 'Intellectual property', p: ['All Platform content, courses, materials, and trademarks are owned by us or our licensors; the User is granted a limited, personal, non-transferable license for learning only.', 'Copying, reselling, distributing, or sharing content/access codes is prohibited. The User retains ownership of their uploaded data and grants us a license to use it as needed to provide the service.'] },
      { h: 'Acceptable use', p: ['You may not use the Platform unlawfully, infringe others’ rights, attempt to hack or disrupt systems, scrape data, or impersonate others or circumvent payment.'] },
      { h: 'User-posted content', p: ['You are responsible for content you post (comments, requests, files) and that it is lawful and non-abusive; we may remove violating content.'] },
      { h: 'Disclaimer of warranties', p: ['The Platform is provided "as is" and "as available" without warranties to the extent permitted by law, without prejudice to your statutory consumer rights.'] },
      { h: 'Limitation of liability', p: ['To the maximum extent permitted by law, we are not liable for indirect or consequential damages, and our total liability shall not exceed the amount you actually paid for the disputed service in the preceding three months. This does not limit any liability that cannot be excluded by law.'] },
      { h: 'Suspension & termination', p: ['We may suspend or terminate your account upon breach, reserving our other legal rights.'] },
      { h: 'Privacy & data protection', p: ['The collection and processing of your data are governed by our Privacy Policy, prepared under the Saudi Personal Data Protection Law (PDPL), which is an integral part of these Terms.'] },
      { h: 'Complaints', p: ['You may submit complaints to us directly, and you have the right to escalate to the Ministry of Commerce and competent authorities via their official channels.'] },
      { h: 'Changes to the Terms', p: ['We may update these Terms; updates take effect once published, and continued use constitutes acceptance.'] },
      { h: 'Governing law & jurisdiction', p: ['These Terms are governed by the laws of the Kingdom of Saudi Arabia, and the competent Saudi judicial authorities have jurisdiction over any dispute.'] },
    ],
  },
}

// ── Privacy Policy (PDPL-aligned) ─────────────────────────────────────────
const PRIVACY: Record<'ar' | 'en', Doc> = {
  ar: {
    title: 'سياسة الخصوصية',
    intro:
      'أُعدّت هذه السياسة وفق نظام حماية البيانات الشخصية (PDPL) في المملكة العربية السعودية، وتشرح كيف نجمع بياناتك ونعالجها ونحميها وننقلها عند استخدامك منصة Pioneers Health Research.',
    sections: [
      { h: 'المتحكّم في البيانات', p: ['جهة التحكّم في بياناتك هي: بايونيرز للأبحاث الصحية (شركة ذات مسؤولية محدودة) — الرقم الموحّد للمنشأة: 7055175363. للتواصل بشأن الخصوصية: ' + EMAIL + '.'] },
      { h: 'البيانات التي نجمعها', p: ['بيانات الحساب (الاسم، البريد، اسم المستخدم، الهاتف)، وبيانات طلبات الخدمات والدورات، والمحتوى الذي ترفعه، وبيانات تقنية للاستخدام (نوع المتصفح وأوقات تسجيل الدخول).'] },
      { h: 'الأساس النظامي لمعالجة البيانات', p: ['نعالج بياناتك بناءً على موافقتك، وعلى ما تتطلبه تهيئة العقد وتقديم الخدمة، وعلى مصلحتنا المشروعة في تشغيل المنصة وتحسينها، والامتثال للأنظمة.'] },
      { h: 'أغراض الاستخدام', p: ['إنشاء حسابك وتقديم الخدمات، والتواصل بشأن طلباتك وحصصك، وإصدار الشهادات، وتحسين المنصة، والامتثال النظامي.'] },
      { h: 'ملفات الارتباط والتخزين المحلي', p: ['نستخدم التخزين المحلي (localStorage) وملفات ضرورية لتشغيل تسجيل الدخول وحفظ تفضيلاتك (كاللغة) فقط، بلا أدوات تتبّع إعلاني خارجية. يمكنك التحكّم بها من متصفحك.'] },
      { h: 'مشاركة البيانات', p: ['لا نبيع بياناتك، ونشاركها فقط مع مزوّدي الخدمة الضروريين لتشغيل المنصة (مثل Supabase للاستضافة وقواعد البيانات، ومزوّد البريد، وبوابة الدفع عند تفعيلها) وبالقدر اللازم.'] },
      {
        h: 'نقل البيانات خارج المملكة',
        p: [
          'قد تُخزَّن بياناتك وتُعالَج على خوادم مزوّدي خدمات تقع خارج المملكة العربية السعودية. وباستخدامك المنصة فإنك توافق على هذا النقل، ونلتزم باتخاذ الضمانات المناسبة وفق المادة (29) من نظام حماية البيانات الشخصية ولوائحه بما يضمن حماية بياناتك.',
        ],
      },
      { h: 'أمن البيانات', p: ['نتّخذ تدابير تقنية وتنظيمية معقولة لحماية بياناتك، ولا يمكن ضمان أمان أي نقل عبر الإنترنت بنسبة 100%. وفي حال وقوع خرقٍ يمسّ بياناتك، نتّخذ الإجراءات النظامية اللازمة.'] },
      { h: 'الاحتفاظ بالبيانات', p: ['نحتفظ ببياناتك طالما كان حسابك نشطًا أو بالقدر اللازم لتقديم الخدمات والامتثال النظامي، ثم نحذفها أو نجعلها مجهولة الهوية.'] },
      { h: 'حقوقك بموجب النظام', p: ['لك الحق في العلم بمعالجة بياناتك، والوصول إليها، وطلب تصحيحها أو تحديثها، وطلب إتلافها، وسحب موافقتك. لممارسة هذه الحقوق تواصل معنا عبر ' + EMAIL + '.'] },
      { h: 'خصوصية الأطفال', p: ['المنصة غير موجّهة لمن هم دون 16 عامًا، ولا نجمع بياناتهم عن قصد.'] },
      { h: 'تعديل السياسة', p: ['قد نحدّث هذه السياسة، ويسري التحديث فور نشره على المنصة.'] },
    ],
  },
  en: {
    title: 'Privacy Policy',
    intro:
      'This policy is prepared under the Saudi Personal Data Protection Law (PDPL) and explains how we collect, process, protect, and transfer your data when you use the Pioneers Health Research platform.',
    sections: [
      { h: 'Data controller', p: ['The controller of your data is: Pioneers for Research LLC — Unified Establishment Number: 7055175363. Privacy contact: ' + EMAIL + '.'] },
      { h: 'Data we collect', p: ['Account data (name, email, username, phone), service/course request data, content you upload, and technical usage data (browser type, sign-in times).'] },
      { h: 'Lawful basis for processing', p: ['We process your data based on your consent, the necessity to form the contract and provide the service, our legitimate interest in operating and improving the Platform, and legal compliance.'] },
      { h: 'Purposes of use', p: ['To create your account and provide services, communicate about your requests and sessions, issue certificates, improve the Platform, and comply with the law.'] },
      { h: 'Cookies & local storage', p: ['We use local storage and essential files only to run sign-in and save preferences (such as language), with no third-party ad tracking. You can control these from your browser.'] },
      { h: 'Data sharing', p: ['We do not sell your data and share it only with service providers necessary to operate the Platform (such as Supabase for hosting/databases, an email provider, and a payment gateway when enabled), only as necessary.'] },
      {
        h: 'Cross-border data transfer',
        p: [
          'Your data may be stored and processed on servers of providers located outside the Kingdom of Saudi Arabia. By using the Platform you consent to this transfer, and we commit to applying appropriate safeguards under Article 29 of the PDPL and its regulations to protect your data.',
        ],
      },
      { h: 'Data security', p: ['We take reasonable technical and organizational measures; no internet transmission can be guaranteed 100% secure. In the event of a breach affecting your data, we take the necessary legal steps.'] },
      { h: 'Data retention', p: ['We keep your data while your account is active or as needed to provide services and comply with the law, after which we delete or anonymize it.'] },
      { h: 'Your rights under the law', p: ['You have the right to be informed about processing, to access your data, to request its correction or update, to request its destruction, and to withdraw consent. To exercise these rights, contact us at ' + EMAIL + '.'] },
      { h: 'Children’s privacy', p: ['The Platform is not directed to anyone under 16, and we do not knowingly collect their data.'] },
      { h: 'Changes to this policy', p: ['We may update this policy; updates take effect once published on the Platform.'] },
    ],
  },
}

export function TermsPage() {
  const { lang } = useLanguage()
  return <LegalDoc doc={TERMS[lang]} effective={EFFECTIVE[lang]} />
}

export function PrivacyPage() {
  const { lang } = useLanguage()
  return <LegalDoc doc={PRIVACY[lang]} effective={EFFECTIVE[lang]} />
}
