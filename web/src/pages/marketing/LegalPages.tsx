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
      'مرحبًا بك في منصة Pioneers Health Research ("المنصة"، "نحن"، "نا"). باستخدامك المنصة أو إنشاء حساب أو الاشتراك في أي خدمة، فإنك تقرّ بأنك قرأت هذه الشروط ووافقت على الالتزام بها بالكامل. إن لم توافق عليها فلا تستخدم المنصة.',
    sections: [
      { h: 'تعريفات', p: ['"المنصة": موقع pioneersresearch.com وما يتصل به من خدمات. "المستخدم/المشترك": كل من ينشئ حسابًا أو يطلب خدمة. "المحتوى": الدورات والمواد والتقارير والاستشارات المقدَّمة عبر المنصة.'] },
      { h: 'الأهلية والحساب', p: ['يجب أن تكون مؤهّلًا قانونيًا لإبرام العقود، وأن تقدّم بيانات صحيحة ومحدَّثة.', 'أنت وحدك المسؤول عن سرية بيانات حسابك وعن كل نشاط يتم من خلاله، وعليك إبلاغنا فورًا بأي استخدام غير مصرّح به. ويحق لنا رفض أو تعليق أي حساب.'] },
      { h: 'طبيعة الخدمات', p: ['تقدّم المنصة تدريبًا وإشرافًا وخدمات بحثية ودورات تعليمية. هذه الخدمات ذات طبيعة تعليمية واستشارية، ولا نضمن تحقيق نتيجة معيّنة (كقبول ورقة للنشر أو الحصول على درجة محددة).', 'تقع المسؤولية النهائية عن البحث ونزاهته العلمية والالتزام بأخلاقيات البحث على عاتق المستخدم.'] },
      { h: 'الأسعار والدفع', p: ['تُعرض الأسعار بالريال السعودي (﷼). قد تُفعَّل بوابات دفع إلكترونية، وقد تتم بعض التسجيلات عبر الطلب دون دفع فوري وفق تقديرنا.', 'جميع الرسوم غير شاملة لأي ضرائب أو رسوم حكومية ما لم يُذكر خلاف ذلك، ويتحمّلها المستخدم عند وجوبها.'] },
      { h: 'سياسة الإلغاء والاسترداد', p: ['يجوز طلب الإلغاء قبل بدء تنفيذ الخدمة. بعد بدء التنفيذ أو تسليم أي جزء من العمل أو منح الوصول إلى المحتوى الرقمي، تُعدّ المبالغ المدفوعة غير قابلة للاسترداد إلا وفق تقديرنا المطلق.', 'الدورات الرقمية والوصول عبر كود التفعيل غير قابلة للاسترداد بعد التفعيل.'] },
      { h: 'الملكية الفكرية', p: ['جميع محتويات المنصة ودوراتها وموادها وعلاماتها التجارية مملوكة لنا أو لمرخّصينا. يُمنح المستخدم ترخيصًا شخصيًا محدودًا غير قابل للتحويل لاستخدام المحتوى لأغراض التعلّم فقط.', 'يُمنع نسخ المحتوى أو إعادة بيعه أو توزيعه أو مشاركته أو مشاركة أكواد الوصول مع الغير.', 'يحتفظ المستخدم بملكية بياناته والمواد التي يرفعها، ويمنحنا ترخيصًا لاستخدامها بالقدر اللازم لتقديم الخدمة.'] },
      { h: 'الاستخدام المقبول', p: ['يُمنع استخدام المنصة لأي غرض غير مشروع، أو انتهاك حقوق الغير، أو محاولة اختراق أو تعطيل الأنظمة، أو الاستخلاص الآلي للبيانات (Scraping)، أو الانتحال أو التحايل على وسائل الدفع.'] },
      { h: 'المحتوى الذي ينشره المستخدم', p: ['أنت مسؤول عن أي محتوى تنشره (تعليقات، طلبات، ملفات) وعن كونه قانونيًا وغير مسيء ولا ينتهك حقوق الغير. ويحق لنا حذف أي محتوى مخالف دون إشعار.'] },
      { h: 'إخلاء الضمانات', p: ['تُقدَّم المنصة وخدماتها "كما هي" و"حسب توافرها" دون أي ضمانات صريحة أو ضمنية، بما في ذلك ضمانات الملاءمة لغرض معيّن أو الخلوّ من الأخطاء أو عدم الانقطاع.'] },
      { h: 'تحديد المسؤولية', p: ['إلى أقصى حدٍّ يسمح به النظام المعمول به، لا نتحمّل أي أضرار غير مباشرة أو تبعية أو عرضية. وفي جميع الأحوال، لا تتجاوز مسؤوليتنا الإجمالية قيمة المبلغ الذي دفعته فعليًا مقابل الخدمة محل النزاع خلال الأشهر الثلاثة السابقة للمطالبة.'] },
      { h: 'التعويض', p: ['توافق على تعويضنا وحمايتنا من أي مطالبات أو خسائر أو أضرار تنشأ عن مخالفتك لهذه الشروط أو استخدامك غير المشروع للمنصة.'] },
      { h: 'التعليق والإنهاء', p: ['يحق لنا تعليق حسابك أو إنهاؤه عند مخالفة هذه الشروط، مع الاحتفاظ بجميع حقوقنا الأخرى بموجب النظام.'] },
      { h: 'الخصوصية', p: ['يخضع جمع بياناتك واستخدامها لسياسة الخصوصية الخاصة بنا، وهي جزء لا يتجزأ من هذه الشروط.'] },
      { h: 'تعديل الشروط', p: ['قد نحدّث هذه الشروط من وقت لآخر، ويسري التحديث فور نشره على المنصة. واستمرارك في الاستخدام بعد النشر يُعدّ قبولًا للتحديث.'] },
      { h: 'القانون الحاكم والاختصاص القضائي', p: ['تخضع هذه الشروط وتُفسَّر وفقًا لأنظمة المملكة العربية السعودية، وتختص الجهات القضائية المختصة في المملكة العربية السعودية بالنظر في أي نزاع ينشأ عنها.'] },
      { h: 'التواصل', p: [`لأي استفسار بشأن هذه الشروط، تواصل معنا عبر: ${EMAIL}`] },
    ],
  },
  en: {
    title: 'Terms of Service',
    intro:
      'Welcome to Pioneers Health Research (the "Platform", "we", "us"). By using the Platform, creating an account, or subscribing to any service, you acknowledge that you have read these Terms and agree to be bound by them in full. If you do not agree, do not use the Platform.',
    sections: [
      { h: 'Definitions', p: ['"Platform": the pioneersresearch.com website and related services. "User/Subscriber": anyone who creates an account or requests a service. "Content": the courses, materials, reports, and consultations provided through the Platform.'] },
      { h: 'Eligibility & account', p: ['You must be legally able to enter into contracts and provide accurate, up-to-date information.', 'You are solely responsible for keeping your account credentials confidential and for all activity under your account, and must notify us immediately of any unauthorized use. We may refuse or suspend any account.'] },
      { h: 'Nature of the services', p: ['The Platform provides training, mentorship, research services, and educational courses. These services are educational and advisory in nature, and we do not guarantee any specific outcome (such as publication acceptance or a particular grade).', 'Final responsibility for the research, its scientific integrity, and research ethics rests with the User.'] },
      { h: 'Pricing & payment', p: ['Prices are shown in Saudi Riyals (﷼). Electronic payment gateways may be enabled, and some registrations may proceed by request without immediate payment at our discretion.', 'All fees are exclusive of any applicable taxes or governmental charges unless stated otherwise; the User bears them where due.'] },
      { h: 'Cancellation & refund policy', p: ['Cancellation may be requested before a service begins. Once work has started, any part of the work has been delivered, or access to digital content has been granted, amounts paid are non-refundable except at our sole discretion.', 'Digital courses and access-code enrollment are non-refundable after activation.'] },
      { h: 'Intellectual property', p: ['All Platform content, courses, materials, and trademarks are owned by us or our licensors. The User is granted a limited, personal, non-transferable license to use the Content for learning purposes only.', 'Copying, reselling, distributing, or sharing the Content or access codes with others is prohibited.', 'The User retains ownership of their own data and uploaded materials and grants us a license to use them as necessary to provide the service.'] },
      { h: 'Acceptable use', p: ['You may not use the Platform for any unlawful purpose, to infringe others’ rights, to attempt to hack or disrupt the systems, to scrape data, or to impersonate others or circumvent payment.'] },
      { h: 'User-posted content', p: ['You are responsible for any content you post (comments, requests, files) and that it is lawful, non-abusive, and does not infringe others’ rights. We may remove any violating content without notice.'] },
      { h: 'Disclaimer of warranties', p: ['The Platform and its services are provided "as is" and "as available" without any express or implied warranties, including warranties of fitness for a particular purpose, error-free operation, or uninterrupted availability.'] },
      { h: 'Limitation of liability', p: ['To the maximum extent permitted by applicable law, we are not liable for any indirect, consequential, or incidental damages. In all cases, our total liability shall not exceed the amount you actually paid for the disputed service in the three months preceding the claim.'] },
      { h: 'Indemnification', p: ['You agree to indemnify and hold us harmless from any claims, losses, or damages arising from your breach of these Terms or your unlawful use of the Platform.'] },
      { h: 'Suspension & termination', p: ['We may suspend or terminate your account upon breach of these Terms, while reserving all our other rights under the law.'] },
      { h: 'Privacy', p: ['The collection and use of your data are governed by our Privacy Policy, which is an integral part of these Terms.'] },
      { h: 'Changes to the Terms', p: ['We may update these Terms from time to time; updates take effect once published on the Platform. Continued use after publication constitutes acceptance.'] },
      { h: 'Governing law & jurisdiction', p: ['These Terms are governed by and construed under the laws of the Kingdom of Saudi Arabia, and the competent judicial authorities in the Kingdom of Saudi Arabia have jurisdiction over any dispute arising from them.'] },
      { h: 'Contact', p: [`For any questions about these Terms, contact us at: ${EMAIL}`] },
    ],
  },
}

// ── Privacy Policy ────────────────────────────────────────────────────────
const PRIVACY: Record<'ar' | 'en', Doc> = {
  ar: {
    title: 'سياسة الخصوصية',
    intro: 'تشرح هذه السياسة كيف نجمع بياناتك ونستخدمها ونحميها عند استخدامك منصة Pioneers Health Research.',
    sections: [
      { h: 'البيانات التي نجمعها', p: ['بيانات الحساب (الاسم، البريد الإلكتروني، اسم المستخدم، رقم الهاتف)، وبيانات طلبات الخدمات والدورات، والمحتوى الذي ترفعه، وبيانات تقنية للاستخدام (نوع المتصفح وأوقات تسجيل الدخول).'] },
      { h: 'كيف نستخدم بياناتك', p: ['لإنشاء حسابك وتقديم الخدمات، والتواصل معك بشأن طلباتك وحصصك، وإصدار الشهادات، وتحسين المنصة، والامتثال للمتطلبات النظامية.'] },
      { h: 'ملفات الارتباط والتخزين المحلي', p: ['نستخدم التخزين المحلي (localStorage) وملفات ضرورية لتشغيل تسجيل الدخول وحفظ تفضيلاتك (كاللغة). لا نستخدم إعلانات أو أدوات تتبّع خارجية. يمكنك التحكّم بهذه الملفات من إعدادات متصفحك.'] },
      { h: 'مشاركة البيانات', p: ['لا نبيع بياناتك. نشاركها فقط مع مزوّدي الخدمة الضروريين لتشغيل المنصة (مثل Supabase للاستضافة وقواعد البيانات، ومزوّد البريد الإلكتروني، وبوابة الدفع عند تفعيلها)، وبالقدر اللازم فقط.'] },
      { h: 'أمن البيانات', p: ['نتّخذ تدابير تقنية وتنظيمية معقولة لحماية بياناتك، لكن لا يمكن ضمان أمان أي نقل عبر الإنترنت بنسبة 100%.'] },
      { h: 'الاحتفاظ بالبيانات', p: ['نحتفظ ببياناتك طالما كان حسابك نشطًا أو بالقدر اللازم لتقديم الخدمات والامتثال النظامي، ثم نحذفها أو نجعلها مجهولة الهوية.'] },
      { h: 'حقوقك', p: ['يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذف حسابك عبر التواصل معنا.'] },
      { h: 'خصوصية الأطفال', p: ['المنصة غير موجّهة لمن هم دون سن 16 عامًا، ولا نجمع بياناتهم عن قصد.'] },
      { h: 'تعديل السياسة', p: ['قد نحدّث هذه السياسة من وقت لآخر، ويسري التحديث فور نشره على المنصة.'] },
      { h: 'التواصل', p: [`لأي استفسار بخصوص خصوصيتك، تواصل معنا عبر: ${EMAIL}`] },
    ],
  },
  en: {
    title: 'Privacy Policy',
    intro: 'This policy explains how we collect, use, and protect your data when you use the Pioneers Health Research platform.',
    sections: [
      { h: 'Data we collect', p: ['Account data (name, email, username, phone), service/course request data, content you upload, and technical usage data (browser type, sign-in times).'] },
      { h: 'How we use your data', p: ['To create your account and provide the services, communicate with you about your requests and sessions, issue certificates, improve the Platform, and comply with legal requirements.'] },
      { h: 'Cookies & local storage', p: ['We use local storage and essential files to run sign-in and save your preferences (such as language). We do not use third-party advertising or tracking tools. You can control these from your browser settings.'] },
      { h: 'Data sharing', p: ['We do not sell your data. We share it only with service providers necessary to operate the Platform (such as Supabase for hosting and databases, an email provider, and a payment gateway when enabled), and only to the extent necessary.'] },
      { h: 'Data security', p: ['We take reasonable technical and organizational measures to protect your data, but no transmission over the internet can be guaranteed 100% secure.'] },
      { h: 'Data retention', p: ['We keep your data while your account is active or as needed to provide services and comply with the law, after which we delete or anonymize it.'] },
      { h: 'Your rights', p: ['You may request access to, correction of, or deletion of your account by contacting us.'] },
      { h: 'Children’s privacy', p: ['The Platform is not directed to anyone under 16, and we do not knowingly collect their data.'] },
      { h: 'Changes to this policy', p: ['We may update this policy from time to time; updates take effect once published on the Platform.'] },
      { h: 'Contact', p: [`For any privacy questions, contact us at: ${EMAIL}`] },
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
