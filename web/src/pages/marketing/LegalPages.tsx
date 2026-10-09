import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { fetchSiteContent, resolveWhatsapp } from '@/lib/content'
import { TERMS_VERSION } from '@/lib/legal'

interface Section {
  h: string
  p: string[]
}
interface Doc {
  title: string
  intro: string
  sections: Section[]
}
type Lang = 'ar' | 'en'

const EFFECTIVE = {
  ar: `تاريخ السريان وآخر تحديث: 9 أكتوبر 2026 — الإصدار ${TERMS_VERSION}`,
  en: `Effective & last updated: 9 October 2026 — version ${TERMS_VERSION}`,
}
const EMAIL = 'pioneersforresearchllc@gmail.com'

const COMPANY_AR =
  'شركة بايونيرز هيلث ريسيرتش كونسالتينج (ذات مسؤولية محدودة)، شركة سعودية مرخّصة من وزارة الاستثمار برقم 24926274626، الرقم الموحّد للمنشأة 7055175363، الرقم الضريبي 3150160068، ومقرها جدة — العنوان الوطني (الرمز المختصر) JHJA8230، وتقدّم خدماتها تحت الاسم التجاري «بايونيرز للأبحاث الصحية / Pioneers Health Research».'
const COMPANY_EN =
  'Pioneers Health Research Consulting (LLC), a Saudi company licensed by the Ministry of Investment (MISA) under No. 24926274626, Unified Establishment No. 7055175363, Tax No. 3150160068, based in Jeddah — National Address (short code) JHJA8230, trading as “Pioneers Health Research”.'

function LegalDoc({ doc, lang }: { doc: Doc; lang: Lang }) {
  const { data: content } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  const wa = resolveWhatsapp(content)
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8 md:py-16">
      <Link to="/" className="mb-4 inline-block text-[13px] text-muted no-underline">
        {lang === 'ar' ? '→ الرئيسية' : '← Home'}
      </Link>
      <h1 className="font-heading mb-2 text-[26px] font-bold text-navy md:text-[32px]">{doc.title}</h1>
      <div className="mb-6 text-[12.5px] text-faint">{EFFECTIVE[lang]}</div>
      <p className="mb-4 text-[15px] leading-8 text-muted-2">{doc.intro}</p>
      <div className="mb-8 rounded-xl border border-border bg-bg-soft px-4 py-3 text-[13.5px] leading-7 text-navy">
        {lang === 'ar' ? 'للتواصل: ' : 'Contact: '}
        <a href={`mailto:${EMAIL}`} className="font-semibold text-navy">
          {EMAIL}
        </a>
        {wa && (
          <>
            {' — '}
            {lang === 'ar' ? 'واتساب: ' : 'WhatsApp: '}
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" dir="ltr" className="font-semibold text-navy">
              +{wa}
            </a>
          </>
        )}
        <div className="mt-1 flex flex-wrap gap-x-4 text-[12.5px]">
          <Link to="/terms" className="text-muted">{lang === 'ar' ? 'الشروط والأحكام' : 'Terms'}</Link>
          <Link to="/privacy" className="text-muted">{lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy'}</Link>
          <Link to="/refund" className="text-muted">{lang === 'ar' ? 'سياسة الاسترجاع والإلغاء' : 'Refund & cancellation'}</Link>
        </div>
      </div>
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

// ── Terms & Conditions ────────────────────────────────────────────────────
const TERMS: Record<Lang, Doc> = {
  ar: {
    title: 'الشروط والأحكام',
    intro:
      'تحكم هذه الشروط والأحكام («الشروط») استخدامك لمنصة pioneersresearch.com وكل ما نقدّمه من خلالها أو من خلال قنوات التواصل المرتبطة بها (مثل واتساب والبريد الإلكتروني). باستخدامك المنصة أو إنشاء حساب أو طلب أي خدمة أو دفع أي مبلغ، فإنك تقرّ بأنك قرأت هذه الشروط وفهمتها ووافقت عليها موافقةً ملزمة، وهي تشكّل مع سياسة الخصوصية وسياسة الاسترجاع والإلغاء الاتفاقَ الكامل بينك وبيننا.',
    sections: [
      {
        h: 'مزوّد الخدمة والصفة القانونية',
        p: [
          `تُقدَّم المنصة وخدماتها من قِبل ${COMPANY_AR} ويُشار إليها في هذه الشروط بـ«الشركة» أو «نحن».`,
          'الشركة شخصية اعتبارية مستقلة ذات مسؤولية محدودة، تمارس نشاطها بموجب الترخيص الصادر لها من وزارة الاستثمار ووفق أنظمة المملكة العربية السعودية. ويُبرم كل تعاقد أو التزام ناشئ عن المنصة أو خدماتها مع الشركة بصفتها الاعتبارية وحدها، وتقتصر مسؤوليتها على ذمتها المالية المستقلة.',
          'لا تنشأ عن هذه الشروط أو عن أي خدمة أو تعامل أي مسؤولية شخصية على الشريك أو المدير أو الموظفين أو المدرّبين أو المتعاونين مع الشركة، ولا يجوز توجيه أي مطالبة إليهم بصفتهم الشخصية، وذلك كله في حدود ما يسمح به النظام.',
        ],
      },
      {
        h: 'التعريفات',
        p: [
          '«المنصة»: الموقع الإلكتروني pioneersresearch.com وتطبيقه وما يرتبط بهما. «العميل» أو «أنت»: كل من يستخدم المنصة أو ينشئ حسابًا أو يطلب خدمة أو يدفع مقابلها، فردًا كان أو جهة. «الخدمات»: الدورات التدريبية والإشراف والاستشارات البحثية والإحصائية والمراجعة والجلسات والورش المباشرة والبرامج المؤسسية وأي خدمة أخرى نقدّمها. «المخرجات»: ما نسلّمه من ملفات أو تقارير أو تحليلات أو ملاحظات أو مواد. «عرض السعر»: العرض الذي نصدره ويحدد نطاق العمل وسعره ومدته وشروطه الخاصة.',
          '«الجهة»: أي منشأة أو مؤسسة تتعاقد معنا لصالح منسوبيها، مثل المستشفيات ومراكز الأبحاث والجامعات ومراكز التدريب والجهات الحكومية والشركات. «المتدرب»: كل شخص يُسجَّل في برنامج تعاقدت عليه جهة. «الباقات»: نماذج البرامج المعروضة في صفحة «للمؤسسات».',
        ],
      },
      {
        h: 'قبول الشروط إلكترونيًا',
        p: [
          'يُعدّ تسجيلك في المنصة، أو ضغطك على زر الموافقة، أو إرسالك طلبًا، أو قبولك عرض سعر عبر أي قناة، أو قيامك بالدفع، قبولًا إلكترونيًا صريحًا لهذه الشروط له الحجية النظامية ذاتها للتوقيع الخطي وفق نظام التعاملات الإلكترونية.',
        ],
      },
      {
        h: 'الأهلية والحساب',
        p: [
          'يجب ألا يقل عمرك عن 18 عامًا، أو أن تستخدم المنصة بموافقة وليّ أمرك وتحت إشرافه.',
          'تلتزم بتقديم بيانات صحيحة وكاملة وتحديثها، وأنت وحدك المسؤول عن سرية بيانات دخولك وعن كل ما يتم من خلال حسابك. يُمنع مشاركة الحساب أو بيعه أو نقله.',
          'يحق لنا رفض أي تسجيل أو طلب، أو تعليق أي حساب أو إغلاقه، وفق تقديرنا ودون إبداء أسباب، مع عدم الإخلال بأي حق نظامي لا يجوز الاتفاق على خلافه.',
        ],
      },
      {
        h: 'طبيعة الخدمات والنزاهة الأكاديمية',
        p: [
          'خدماتنا ذات طبيعة تعليمية وتدريبية وإرشادية واستشارية، تهدف إلى تطوير مهاراتك البحثية ومساعدتك على فهم المنهجية والتحليل وتحسين عملك. والمخرجات نماذج ومواد مرجعية وتعليمية لاستخدامك الشخصي.',
          'أنت وحدك المسؤول عن طريقة استخدامك للمخرجات، وعن التزامك بأنظمة وسياسات جامعتك أو جهتك العلمية أو جهة النشر، بما في ذلك سياسات النزاهة الأكاديمية والانتحال والإفصاح عن المساعدة. ولا تتحمل الشركة أي مسؤولية عن أي إجراء أو قرار أو جزاء تتخذه أي جهة بحقك.',
          'لا نضمن الحصول على درجة أو تقدير معين، ولا قبول مقترح أو رسالة أو بحث، ولا موافقة مشرف أو لجنة، ولا قبول النشر في أي مجلة؛ فهذه قرارات تعود لجهات مستقلة عنا.',
          'يحق لنا رفض أو إيقاف أي طلب نرى أنه يخالف الأنظمة أو أخلاقيات البحث العلمي، دون أي التزام تجاه العميل.',
          'المحتوى والخدمات ذات طابع تعليمي وبحثي فقط، ولا تُعدّ استشارة طبية أو علاجية أو تشخيصية، ولا يجوز الاعتماد عليها في اتخاذ قرارات سريرية تخص أي مريض.',
        ],
      },
      {
        h: 'الطلبات وعروض الأسعار',
        p: [
          'تُسعَّر الخدمات البحثية بحسب كل طلب وحجمه وتخصصه ومدته، ونرسل لك عرض سعر يحدد نطاق العمل والسعر والمدة التقريبية. وتُعرض أسعار الدورات بالريال السعودي في صفحاتها.',
          'عرض السعر صالح لمدة 7 أيام من تاريخ إرساله ما لم يُذكر خلاف ذلك، ويحق لنا تعديله أو سحبه قبل الدفع.',
          'يقتصر التزامنا على النطاق المحدد في عرض السعر فقط. وأي إضافة أو تغيير في المتطلبات أو العنوان أو المنهجية أو البيانات بعد الموافقة — بما في ذلك التغييرات التي يطلبها مشرفك أو لجنتك — تُعدّ عملًا إضافيًا يُسعَّر بعرض مستقل.',
        ],
      },
      {
        h: 'الدفع',
        p: [
          'يُدفع كامل المبلغ مقدمًا قبل بدء العمل ما لم ينص عرض السعر أو العقد على جدول دفعات مختلف. ولا نبدأ التنفيذ إلا بعد تأكيد استلام الدفعة المستحقة.',
          'جميع الأسعار والمبالغ بالريال السعودي ما لم يُذكر خلاف ذلك. وعند تأخر سداد أي دفعة مستحقة يحق للشركة إيقاف الخدمة أو الوصول إلى المحتوى حتى السداد، دون فرض أي فوائد تأخير، ومع احتفاظها بحقها في المطالبة بالمبلغ.',
          'يتم الدفع عبر بوابات الدفع الإلكتروني المعتمدة (مثل مدى والبطاقات الائتمانية وApple Pay) أو بالتحويل البنكي إلى حساب الشركة. ولا نخزّن بيانات بطاقتك؛ إذ تعالجها بوابة الدفع مباشرة.',
          'يتحمّل العميل أي رسوم تحويل أو رسوم بنكية من جهته. وتُصدر الشركة فاتورة بكل عملية.',
          'الشركة غير مسجّلة حاليًا في ضريبة القيمة المضافة لعدم بلوغها حد التسجيل الإلزامي، وعند وجوب التسجيل نظامًا ستُضاف الضريبة وتُوضَّح في عروض الأسعار والفواتير.',
        ],
      },
      {
        h: 'التنفيذ والتسليم',
        p: [
          'تبدأ مدة التنفيذ من تاريخ تأكيد الدفع واستلامنا جميع المواد والبيانات والمعلومات اللازمة منك، أيهما أبعد. وأي تأخير منك في تزويدنا بها أو في الرد علينا يمدّد مدة التسليم تلقائيًا بالقدر نفسه على الأقل.',
          'يتم التسليم إلكترونيًا عبر المنصة أو البريد الإلكتروني أو واتساب، ويُعدّ التسليم تامًا بمجرد إرسال المخرجات إليك. لا توجد منتجات مادية أو شحن.',
          'لديك 7 أيام من التسليم لإبلاغنا كتابيًا بأي ملاحظات ضمن النطاق المتفق عليه؛ وبانقضائها دون ملاحظات تُعدّ المخرجات مقبولة نهائيًا.',
          'إذا توقف العميل عن التواصل أو عن تزويدنا بما يلزم مدة 30 يومًا متصلة، يحق لنا إغلاق الطلب وتسليم ما أُنجز منه، ويُعدّ الطلب منفّذًا دون أي استرداد.',
        ],
      },
      {
        h: 'التعديلات',
        p: [
          'تشمل الخدمة جولتين (2) من التعديلات ضمن النطاق المتفق عليه، تُطلب خلال 14 يومًا من التسليم.',
          'لا تُعدّ تعديلًا: المتطلبات الجديدة، أو تغيير العنوان أو الأهداف أو المنهجية أو البيانات، أو أي عمل خارج عرض السعر؛ وتُسعَّر بعرض مستقل.',
        ],
      },
      {
        h: 'الإلغاء والاسترداد',
        p: [
          'جميع المبالغ المدفوعة نهائية وغير قابلة للاسترداد، وفق ما هو مفصّل في سياسة الاسترجاع والإلغاء التي تُعدّ جزءًا لا يتجزأ من هذه الشروط. وبدفعك فإنك توافق صراحةً على البدء الفوري في تنفيذ خدمة مخصّصة لك، وتُقرّ بأن ذلك يُسقط حق الإلغاء بعد بدء التنفيذ، وذلك في حدود ما يسمح به النظام.',
        ],
      },
      {
        h: 'التعاقد مع الجهات والمؤسسات',
        p: [
          'تسري هذه الشروط على تعاقدات الجهات، ويُقدَّم ما يرد في عرض السعر المعتمد أو العقد الموقّع عليها عند التعارض، بما في ذلك نطاق البرنامج وجدول الدفعات ومواعيد إعادة الجدولة والمخرجات. وما لم يتناوله عرض السعر أو العقد تحكمه هذه الشروط.',
          'الباقات ومحتواها والتزاماتها المعروضة في صفحة «للمؤسسات» استرشادية لتوضيح نماذج التعاون، والملزم للطرفين هو عرض السعر الرسمي الصادر باسم الجهة بعد اعتمادها له. وتسري أي ميزة واردة في الباقة (كخصم قيمة الورشة التجريبية من برنامج لاحق) وفق شروطها المذكورة فيها.',
          'يُقرّ من يعتمد عرض السعر أو يوقّع العقد نيابة عن الجهة بأنه مفوَّض بذلك نظامًا، وتلتزم الجهة بجميع ما يترتب عليه.',
          'تلتزم الجهة بدقة بيانات منسوبيها التي تزوّدنا بها، وبالحصول على أي موافقات داخلية لازمة، وبإشعار المتدربين بأن بيانات تقدّمهم في البرنامج ستُشارك معها، وبتوفير القاعة والتجهيزات وتصاريح الدخول عند التقديم الحضوري، وبضمان التزام المتدربين بهذه الشروط عند استخدامهم المنصة.',
          'يلتزم كل طرف بسرية المعلومات غير العامة التي يطّلع عليها من الطرف الآخر، ولا يستخدمها إلا لتنفيذ التعاقد، ويستمر هذا الالتزام بعد انتهائه.',
          'يلتزم الطرفان بأنظمة مكافحة الرشوة والفساد، ولا يجوز لأي منهما تقديم أو عرض أي هدية أو منفعة لمنسوبي الطرف الآخر بقصد التأثير على التعاقد أو تنفيذه.',
          'إذا كانت الجهة حكومية وأوجبت أنظمة المشتريات الحكومية أحكامًا إلزامية على التعاقد، فتُطبَّق تلك الأحكام في حدود ما توجبه.',
          'لا تتجاوز المسؤولية الإجمالية للشركة تجاه الجهة المبالغ التي سددتها فعليًا عن البرنامج محل المطالبة.',
        ],
      },
      {
        h: 'الدورات والمحتوى الرقمي والجلسات المباشرة',
        p: [
          'يُمنح المشترك في الدورة ترخيصًا شخصيًا محدودًا غير قابل للنقل للوصول إلى محتواها خلال مدة إتاحتها. ويُمنع تسجيل المحتوى أو نسخه أو مشاركته أو مشاركة رموز الوصول، ويحق لنا إيقاف الوصول فورًا دون استرداد عند المخالفة.',
          'الجلسات المباشرة تُعقد في مواعيدها المحددة، ولا تُعوَّض الجلسة التي يتغيب عنها العميل. ويمكن للأفراد إعادة جدولة جلسة واحدة إذا أُبلغنا قبل 24 ساعة على الأقل، وفق التوفر. أما برامج الجهات فتخضع لمواعيد إعادة الجدولة المحددة في عرض السعر أو الباقة.',
          'يجوز للشركة تسجيل الجلسات المباشرة لأغراض الجودة وإتاحة التسجيل للمسجلين في البرنامج، مع إشعار المشاركين بذلك. ويُحظر على المشاركين تسجيل الجلسات أو تصويرها أو نشرها دون إذن كتابي من الشركة.',
        ],
      },
      {
        h: 'الشهادات والاعتماد',
        p: [
          'تُصدر الشركة شهادات إتمام إلكترونية قابلة للتحقق عند استيفاء متطلبات البرنامج، ويحق لها إلغاء أي شهادة يثبت الحصول عليها بطريقة غير مشروعة.',
          'شهادات الشركة شهادات إتمام تدريبي صادرة عنها، ولا تُعدّ مؤهلًا أكاديميًا أو درجة علمية أو ترخيصًا مهنيًا، ولا تحمل اعتماد أي جهة حكومية أو مهنية ما لم يُنص على ذلك صراحةً في وصف البرنامج.',
          'احتساب ساعات التعليم الطبي المستمر أو أي اعتماد مهني يخضع لقرار الجهة المختصة (مثل الهيئة السعودية للتخصصات الصحية أو الجهة التي يتبع لها المتدرب)، وتلتزم الشركة بتزويد الجهة بما يلزم من محاور وساعات، دون أن تضمن قبول الاعتماد.',
        ],
      },
      {
        h: 'المدرّبون والمتعاونون',
        p: [
          'يجوز للشركة الاستعانة بمدرّبين ومختصين مؤهلين يعملون معها بصفتهم متعاونين مستقلين، وتبقى الشركة هي المسؤولة أمام العميل عن الخدمة المتعاقد عليها. ولا تمثّل الآراء الشخصية للمدرّبين خارج نطاق الخدمة رأي الشركة.',
          'يلتزم العميل — فردًا كان أو جهة — بعدم التعاقد مباشرة أو عبر طرف آخر مع أي مدرّب أو مختص تعرّف عليه من خلال الشركة، لتقديم خدمات من الطبيعة ذاتها، طوال مدة التعامل ولمدة اثني عشر (12) شهرًا بعد انتهائه، إلا بموافقة الشركة الكتابية.',
        ],
      },
      {
        h: 'الملكية الفكرية',
        p: [
          'جميع محتويات المنصة وموادها ودوراتها وتصاميمها وعلاماتها التجارية وقوالبها وأساليب عملها مملوكة للشركة أو مرخّصة لها، ومحمية بموجب الأنظمة.',
          'بعد سداد كامل المبلغ، يحصل العميل على حق استخدام المخرجات الخاصة بطلبه لأغراضه الشخصية. وتحتفظ الشركة بحقوقها في أدواتها وقوالبها ومعارفها العامة، ويجوز لها إعادة استخدامها دون أي بيانات تعريفية بالعميل.',
          'يحتفظ العميل بملكية البيانات والمواد التي يزوّدنا بها، ويمنحنا ترخيصًا لاستخدامها بالقدر اللازم لتنفيذ الخدمة.',
        ],
      },
      {
        h: 'السرية',
        p: [
          'نلتزم بالحفاظ على سرية ملفاتك وبياناتك البحثية وعدم إفشائها لأي طرف خارج فريق العمل المكلّف بطلبك، إلا بموافقتك أو بطلب من جهة مختصة نظامًا.',
        ],
      },
      {
        h: 'التزامات العميل والاستخدام المحظور',
        p: [
          'يُحظر استخدام المنصة لأي غرض غير مشروع، أو تقديم بيانات أو مستندات مزوّرة، أو انتهاك حقوق الغير، أو محاولة الاختراق أو تعطيل الأنظمة أو استخلاص البيانات آليًا، أو الإساءة لفريق العمل، أو التحايل على وسائل الدفع، أو إعادة بيع خدماتنا أو مخرجاتها لأطراف أخرى دون إذن كتابي.',
          'تقرّ بأن المواد والبيانات التي تزوّدنا بها مملوكة لك أو يحق لك استخدامها، وأنك حصلت على أي موافقات أخلاقية لازمة لجمعها.',
        ],
      },
      {
        h: 'المحتوى الذي تنشره والتقييمات',
        p: [
          'أنت مسؤول عن أي محتوى تنشره في المنصة. وعند إرسالك تقييمًا أو رأيًا، فإنك تمنحنا حقًا غير حصري ومجانيًا لنشره على المنصة وحساباتنا مع اسمك الأول، ويحق لنا حذف أي محتوى مخالف.',
        ],
      },
      {
        h: 'برنامج الإحالة',
        p: [
          'لكل مستخدم رابط إحالة خاص. وتُحتسب الإحالة مؤهلة فقط إذا سجّل الشخص المُحال حسابًا جديدًا من الرابط، ثم سجّل في دورة ودفع الدفعة المقدمة على الأقل. ولا يكفي مجرد التسجيل في المنصة.',
          'عند تحقق الإحالة المؤهلة: يحصل صاحب الرابط على خصم 10% عن كل إحالة مؤهلة، ويحصل الشخص المُحال على خصم 5%. ولا يتجاوز مجموع الخصومات 20% على الطلب أو الدورة الواحدة لأي من الطرفين، مهما تعددت الإحالات.',
          'تُطبَّق خصومات صاحب الرابط على طلبه أو دورته التالية، ويُطبَّق خصم المُحال على المبلغ المتبقي من دورته أو على طلبه التالي. والخصم شخصي لا يُنقل لغيرك، ولا يُستبدل بمبلغ نقدي، ولا يُسترد، ولا يُجمع مع العروض الأخرى إلا بموافقة الشركة.',
          'لا تُحتسب الإحالة إذا أحال المستخدم نفسه أو حسابًا آخر يملكه، أو إذا كان الشخص المُحال مسجلًا لدينا من قبل. ويحق للشركة إلغاء أي خصم ناتج عن تحايل أو حسابات وهمية، وتعديل البرنامج أو إيقافه في أي وقت دون أثر على الخصومات المستحقة قبل ذلك.',
        ],
      },
      {
        h: 'الاعتراض على المدفوعات',
        p: [
          'يلتزم العميل بالتواصل معنا أولًا لحل أي خلاف قبل الاعتراض على أي عملية دفع لدى البنك أو جهة إصدار البطاقة. ويُعدّ الاعتراض دون ذلك أو بالمخالفة لهذه الشروط إخلالًا جوهريًا يخوّلنا تعليق الحساب وإيقاف الخدمات والمطالبة بالمبالغ ورسوم الاعتراض، مع تقديم ما يثبت تنفيذ الخدمة للجهات المعنية.',
        ],
      },
      {
        h: 'إخلاء الضمانات',
        p: [
          'تُقدَّم المنصة والخدمات «كما هي» و«حسب التوافر»، دون أي ضمانات صريحة أو ضمنية غير منصوص عليها في هذه الشروط، وإلى أقصى حد يسمح به النظام.',
        ],
      },
      {
        h: 'تحديد المسؤولية',
        p: [
          'إلى أقصى حد يسمح به النظام، لا تتحمل الشركة أي أضرار غير مباشرة أو تبعية أو خاصة، ولا أي خسارة في الدرجات أو الفرص الأكاديمية أو الوظيفية أو الأرباح أو الوقت أو البيانات.',
          'لا تتجاوز المسؤولية الإجمالية للشركة في أي حال المبلغ الذي دفعه العميل فعليًا مقابل الخدمة محل المطالبة.',
          'لا يحدّ هذا البند من أي مسؤولية لا يجوز استبعادها نظامًا.',
        ],
      },
      {
        h: 'التعويض',
        p: [
          'يلتزم العميل بتعويض الشركة وموظفيها ومتعاونيها والدفاع عنهم ضد أي مطالبات أو خسائر أو تكاليف (بما فيها أتعاب المحاماة المعقولة) تنشأ عن مخالفته هذه الشروط أو الأنظمة، أو عن طريقة استخدامه للمخرجات، أو عن المواد التي زوّدنا بها.',
        ],
      },
      {
        h: 'القوة القاهرة',
        p: ['لا تُسأل الشركة عن أي تأخير أو إخفاق ناتج عن ظروف خارجة عن سيطرتها المعقولة، مثل الأعطال التقنية العامة، أو انقطاع الخدمات الخارجية، أو الكوارث، أو القرارات الحكومية.'],
      },
      {
        h: 'خدمات الأطراف الثالثة',
        p: [
          'تعتمد المنصة على خدمات أطراف ثالثة (مثل بوابات الدفع ومزوّدي الاستضافة ومنصات الاتصال المرئي وواتساب)، ويخضع استخدامك لها لشروطها، ولا نتحمل مسؤولية أعطالها.',
        ],
      },
      {
        h: 'التواصل والإشعارات',
        p: [
          'تُعدّ الرسائل المرسلة عبر المنصة أو البريد الإلكتروني المسجّل أو رقم الجوال/واتساب المسجّل في حسابك أو الذي تواصلت معنا منه إشعارات كتابية صحيحة ومنتجة لآثارها. وتلتزم بإبقاء بيانات تواصلك صحيحة ومحدّثة، وتوافق على تلقي رسائل تتعلق بطلباتك وحسابك.',
        ],
      },
      {
        h: 'السجلات الإلكترونية والإثبات',
        p: [
          'تحتفظ الشركة بسجلات إلكترونية لموافقتك على هذه الشروط (بما في ذلك رقم إصدارها وتاريخ ووقت الموافقة)، ولطلباتك ومدفوعاتك ومراسلاتك وعمليات التسليم. وتُعدّ هذه السجلات حجة في الإثبات وفق نظام التعاملات الإلكترونية ونظام الإثبات، ما لم يثبت خلافها.',
        ],
      },
      {
        h: 'التعليق والإنهاء',
        p: [
          'يحق لنا تعليق حسابك أو إنهاؤه أو إيقاف أي خدمة فورًا عند مخالفة هذه الشروط أو إساءة الاستخدام، دون استرداد لأي مبالغ، مع الاحتفاظ بحقوقنا الأخرى.',
        ],
      },
      {
        h: 'أحكام عامة',
        p: [
          'إذا اعتُبر أي حكم في هذه الشروط باطلًا، يبقى باقي الأحكام نافذًا. ولا يُعدّ عدم ممارستنا لأي حق تنازلًا عنه. ويحق للشركة التنازل عن حقوقها والتزاماتها لأي جهة تابعة أو خلف لها، بما في ذلك عند إعادة الهيكلة أو تغيير الملكية. ولا يجوز للعميل التنازل دون موافقتنا الكتابية.',
          'تبقى أحكام السرية والملكية الفكرية وتحديد المسؤولية والتعويض وعدم التعاقد المباشر مع المدرّبين وتسوية النزاعات نافذة بعد انتهاء التعامل أو إغلاق الحساب.',
          'تسود النسخة العربية من هذه الشروط عند أي اختلاف مع ترجمتها، وتُحتسب المدد بالتقويم الميلادي.',
        ],
      },
      {
        h: 'تعديل الشروط',
        p: [
          'يحق لنا تعديل هذه الشروط وسياسة الخصوصية وسياسة الاسترجاع في أي وقت، ويسري التعديل من تاريخ نشره على المنصة على الاستخدامات والطلبات اللاحقة له، دون أثر على الطلبات المدفوعة قبله.',
          'عند التعديل الجوهري نطلب منك الموافقة على الإصدار الجديد عند دخولك التالي إلى حسابك، ولا يمكن الاستمرار في استخدام الحساب دون الموافقة. واستمرارك في استخدام المنصة بعد النشر يُعدّ موافقة على التعديل.',
        ],
      },
      {
        h: 'النظام الواجب التطبيق وتسوية النزاعات',
        p: [
          'تخضع هذه الشروط وتُفسَّر وفق أنظمة المملكة العربية السعودية. ويسعى الطرفان لحل أي خلاف وديًا خلال 30 يومًا من إخطار أحدهما الآخر به كتابيًا، فإن تعذّر ذلك تختص المحاكم المختصة في مدينة جدة بالفصل فيه.',
          'في التعاقدات مع الجهات، يجوز النص في العقد على إحالة النزاع إلى التحكيم لدى المركز السعودي للتحكيم التجاري، ويكون مقر التحكيم مدينة جدة ولغته العربية.',
          'لا يخلّ ما ورد في هذه الشروط بأي حق نظامي للمستهلك لا يجوز الاتفاق على خلافه، ويحق لك تقديم شكواك إلينا عبر قنوات التواصل أعلاه أو إلى الجهات المختصة.',
        ],
      },
    ],
  },
  en: {
    title: 'Terms & Conditions',
    intro:
      'These Terms & Conditions (“Terms”) govern your use of pioneersresearch.com and everything we provide through it or through linked channels (such as WhatsApp and email). By using the platform, creating an account, requesting any service, or making any payment, you confirm you have read, understood, and agreed to be bound by these Terms, which together with our Privacy Policy and Refund & Cancellation Policy form the entire agreement between you and us. The Arabic version prevails.',
    sections: [
      { h: 'Service provider & legal status', p: [`The platform and services are provided by ${COMPANY_EN} (the “Company”, “we”).`, 'The Company is an independent legal entity with limited liability, operating under its Ministry of Investment licence and the laws of Saudi Arabia. Every contract or obligation arising from the platform or its services is made with the Company in its corporate capacity alone, and its liability is limited to its own separate assets.', 'No personal liability arises under these Terms or any service or dealing for the Company’s partner, manager, employees, trainers or collaborators, and no claim may be brought against them personally, all to the extent permitted by law.'] },
      { h: 'Definitions', p: ['“Platform”: pioneersresearch.com and related apps. “Customer”/“you”: anyone, individual or organization, using the platform, creating an account, requesting or paying for a service. “Services”: courses, mentoring, research and statistical consulting, review, live sessions and workshops, institutional programs and any other service we provide. “Deliverables”: files, reports, analyses, notes or materials we deliver. “Quote”: our offer setting the scope, price, duration and any special terms.', '“Organization”: any entity contracting with us for its staff, such as hospitals, research centers, universities, training centers, government bodies and companies. “Trainee”: anyone enrolled in a program contracted by an Organization. “Packages”: the program formats shown on the “For organizations” page.'] },
      { h: 'Electronic acceptance', p: ['Registering, clicking accept, sending a request, accepting a quote through any channel, or paying constitutes express electronic acceptance of these Terms, with the same legal effect as a handwritten signature under the Electronic Transactions Law.'] },
      { h: 'Eligibility & account', p: ['You must be at least 18, or use the platform with a guardian’s consent and supervision.', 'You must provide accurate information and are solely responsible for your credentials and all activity under your account. Sharing, selling or transferring accounts is prohibited.', 'We may refuse any registration or request, or suspend or close any account, at our discretion without giving reasons, without prejudice to non-waivable statutory rights.'] },
      { h: 'Nature of services & academic integrity', p: ['Our services are educational, training, mentoring and consulting in nature. Deliverables are reference and learning materials for your personal use.', 'You alone are responsible for how you use deliverables and for complying with your university’s, institution’s or publisher’s rules, including academic-integrity, plagiarism and disclosure policies. The Company bears no responsibility for any action, decision or penalty taken against you.', 'We do not guarantee any grade, acceptance of a proposal, thesis or paper, supervisor or committee approval, or publication — these are decisions of independent parties.', 'We may refuse or stop any request we consider unlawful or contrary to research ethics, without obligation.', 'Content and services are educational and research-oriented only; they are not medical, therapeutic or diagnostic advice and must not be relied on for clinical decisions about any patient.'] },
      { h: 'Requests & quotes', p: ['Research services are priced per request according to size, field and duration; we send a quote defining scope, price and approximate timeline. Course prices are shown in SAR on their pages.', 'A quote is valid for 7 days unless stated otherwise; we may amend or withdraw it before payment.', 'Our obligation is limited to the quoted scope. Any addition or change to requirements, title, methodology or data after acceptance — including changes requested by your supervisor or committee — is additional work quoted separately.'] },
      { h: 'Payment', p: ['Full payment is due in advance before work starts unless the quote or contract sets a different payment schedule; we start only after the due payment is confirmed.', 'All prices and amounts are in Saudi riyals unless stated otherwise. If a due payment is late, the Company may suspend the service or content access until payment, without charging any late interest, while reserving its right to claim the amount.', 'Payment is made through approved online gateways (e.g. mada, credit cards, Apple Pay) or by bank transfer to the Company’s account. We do not store your card data; the gateway processes it directly.', 'You bear any transfer or bank fees on your side. The Company issues an invoice for each transaction.', 'The Company is not currently VAT-registered as it has not reached the mandatory threshold; if registration becomes mandatory, VAT will be added and shown on quotes and invoices.'] },
      { h: 'Performance & delivery', p: ['The delivery period starts from the later of payment confirmation and our receipt of all materials, data and information we need from you. Any delay on your side extends delivery by at least the same period.', 'Delivery is electronic via the platform, email or WhatsApp and is complete once deliverables are sent. There are no physical goods or shipping.', 'You have 7 days from delivery to send written in-scope remarks; after that, deliverables are deemed finally accepted.', 'If you stop responding or providing what we need for 30 consecutive days, we may close the request and deliver the work completed so far; the request is then deemed fulfilled without refund.'] },
      { h: 'Revisions', p: ['Services include two (2) rounds of in-scope revisions, requested within 14 days of delivery.', 'New requirements, changes of title, aims, methodology or data, or any work outside the quote are not revisions and are quoted separately.'] },
      { h: 'Cancellation & refunds', p: ['All payments are final and non-refundable, as detailed in our Refund & Cancellation Policy, which forms part of these Terms. By paying you expressly agree to the immediate start of a service customised for you and acknowledge that this removes the right to cancel once performance has begun, to the extent permitted by law.'] },
      { h: 'Contracts with organizations', p: ['These Terms apply to Organization contracts; where they conflict, the approved quote or signed contract prevails, including program scope, payment schedule, rescheduling notice and deliverables. Anything the quote or contract does not cover is governed by these Terms.', 'Packages and the commitments shown on the “For organizations” page are indicative, to illustrate engagement models; what binds both parties is the formal quote issued in the Organization’s name once approved. Any benefit stated in a package (such as crediting a pilot workshop toward a later program) applies on the terms stated there.', 'Whoever approves a quote or signs a contract for an Organization confirms they are legally authorised to do so, and the Organization is bound by it.', 'The Organization is responsible for the accuracy of its staff data, for any internal approvals, for informing trainees that their program progress data will be shared with it, for providing the venue, equipment and access permits for on-site delivery, and for ensuring trainees comply with these Terms when using the platform.', 'Each party will keep confidential the non-public information it receives from the other and use it only to perform the contract; this survives termination.', 'Both parties will comply with anti-bribery and anti-corruption laws; neither may offer or give any gift or benefit to the other’s staff to influence the contract or its performance.', 'Where the Organization is a government body and government procurement rules impose mandatory terms, those terms apply to the extent required.', 'The Company’s total liability to an Organization shall not exceed the amounts it actually paid for the program giving rise to the claim.'] },
      { h: 'Courses, digital content & live sessions', p: ['Course subscribers receive a limited, personal, non-transferable licence to access content during its availability. Recording, copying or sharing content or access codes is prohibited; we may revoke access immediately without refund.', 'Live sessions run at their scheduled times; sessions you miss are not compensated. Individuals may reschedule one session with at least 24 hours’ notice, subject to availability; Organization programs follow the rescheduling notice set in their quote or package.', 'The Company may record live sessions for quality purposes and to make recordings available to enrolled participants, who will be informed. Participants may not record, film or publish sessions without the Company’s written permission.'] },
      { h: 'Certificates & accreditation', p: ['The Company issues digitally verifiable completion certificates when program requirements are met, and may revoke any certificate obtained unlawfully.', 'Company certificates are training-completion certificates issued by the Company; they are not an academic qualification, degree or professional licence, and carry no governmental or professional accreditation unless the program description expressly says so.', 'Counting hours toward continuing medical education or any professional accreditation is decided by the competent body (such as the Saudi Commission for Health Specialties or the trainee’s employer). The Company will provide the required outline and hours but does not guarantee accreditation.'] },
      { h: 'Trainers & collaborators', p: ['The Company may engage qualified trainers and specialists working as independent collaborators; the Company remains responsible to the customer for the contracted service. Trainers’ personal views outside the service do not represent the Company.', 'The customer — individual or Organization — will not contract, directly or through another party, with any trainer or specialist met through the Company for services of the same nature, during the engagement and for twelve (12) months after it ends, without the Company’s written consent.'] },
      { h: 'Intellectual property', p: ['All platform content, materials, courses, designs, trademarks, templates and methods are owned by or licensed to the Company and legally protected.', 'After full payment, you may use the deliverables of your request for your personal purposes. The Company retains its rights in its tools, templates and general know-how and may reuse them without any data identifying you.', 'You retain ownership of the data and materials you provide and license us to use them as needed to perform the service.'] },
      { h: 'Confidentiality', p: ['We keep your files and research data confidential and do not disclose them outside the team working on your request, except with your consent or as required by a competent authority.'] },
      { h: 'Your obligations & prohibited use', p: ['You may not use the platform unlawfully, submit forged data or documents, infringe others’ rights, attempt to hack, disrupt or scrape the platform, abuse our team, circumvent payment, or resell our services or deliverables without written permission.', 'You confirm that materials and data you provide are yours or that you may use them, and that you obtained any ethical approvals required to collect them.'] },
      { h: 'Your content & reviews', p: ['You are responsible for content you post. By submitting a review you grant us a free, non-exclusive right to publish it on the platform and our channels with your first name; we may remove violating content.'] },
      { h: 'Referral programme', p: ['Each user has a personal referral link. A referral qualifies only if the referred person creates a new account through the link, then enrols in a course and pays at least the down payment; signing up alone does not qualify.', 'For each qualifying referral, the link owner earns a 10% discount and the referred person a 5% discount. Total discounts may not exceed 20% on any single order or course for either party, however many referrals are made.', 'The link owner’s discounts apply to their next order or course; the referred person’s discount applies to the remaining balance of their course or their next order. Discounts are personal, non-transferable, have no cash value, are non-refundable, and cannot be combined with other offers unless the Company agrees.', 'Self-referrals, referrals to another account you own, and people already registered with us do not qualify. The Company may cancel any discount obtained through abuse or fake accounts, and may change or end the programme at any time without affecting discounts already earned.'] },
      { h: 'Payment disputes', p: ['You must contact us first to resolve any disagreement before disputing a payment with your bank or card issuer. A dispute filed without doing so, or contrary to these Terms, is a material breach entitling us to suspend your account and services and claim the amounts and dispute fees, and we will provide evidence of performance to the relevant parties.'] },
      { h: 'Disclaimer of warranties', p: ['The platform and services are provided “as is” and “as available”, without express or implied warranties not stated in these Terms, to the maximum extent permitted by law.'] },
      { h: 'Limitation of liability', p: ['To the maximum extent permitted by law, the Company is not liable for indirect, consequential or special damages, or for any loss of grades, academic or career opportunities, profits, time or data.', 'The Company’s total liability shall in no case exceed the amount you actually paid for the service giving rise to the claim.', 'Nothing here limits liability that cannot be excluded by law.'] },
      { h: 'Indemnity', p: ['You will indemnify and defend the Company, its staff and collaborators against any claims, losses or costs (including reasonable legal fees) arising from your breach of these Terms or the law, your use of deliverables, or materials you provided.'] },
      { h: 'Force majeure', p: ['We are not liable for delay or failure caused by circumstances beyond our reasonable control, such as general technical failures, third-party outages, disasters or government decisions.'] },
      { h: 'Third-party services', p: ['The platform relies on third parties (payment gateways, hosting, video, WhatsApp); your use of them is subject to their terms and we are not responsible for their failures.'] },
      { h: 'Communications & notices', p: ['Messages sent through the platform, to your registered email, or to the mobile/WhatsApp number registered in your account or that you contacted us from are valid written notices. You must keep your contact details accurate and up to date, and you agree to receive messages about your requests and account.'] },
      { h: 'Electronic records & evidence', p: ['The Company keeps electronic records of your acceptance of these Terms (including the version, date and time), and of your requests, payments, communications and deliveries. These records constitute evidence under the Electronic Transactions Law and the Law of Evidence unless proven otherwise.'] },
      { h: 'Suspension & termination', p: ['We may suspend or terminate your account or stop any service immediately for breach or misuse, without refund, reserving our other rights.'] },
      { h: 'General', p: ['If any provision is held invalid, the rest remain in force. Our failure to exercise a right is not a waiver. The Company may assign its rights and obligations to an affiliate or successor, including on restructuring or change of ownership; you may not assign without our written consent.', 'Provisions on confidentiality, intellectual property, limitation of liability, indemnity, non-solicitation of trainers and dispute resolution survive the end of the relationship or account closure.', 'The Arabic version of these Terms prevails over any translation; periods are counted in the Gregorian calendar.'] },
      { h: 'Changes', p: ['We may amend these Terms, the Privacy Policy and the Refund Policy at any time; changes apply from publication to subsequent use and requests, without affecting orders paid before.', 'For material changes we ask you to accept the new version on your next sign-in, and the account cannot be used further without accepting. Continued use of the platform after publication constitutes acceptance.'] },
      { h: 'Governing law & disputes', p: ['These Terms are governed by and construed under the laws of the Kingdom of Saudi Arabia. The parties will try to settle any dispute amicably within 30 days of written notice; failing that, the competent courts in Jeddah have jurisdiction.', 'For Organization contracts, the contract may refer disputes to arbitration at the Saudi Center for Commercial Arbitration, seated in Jeddah, in Arabic.', 'Nothing in these Terms affects non-waivable statutory consumer rights; you may complain to us via the contact details above or to the competent authorities.'] },
    ],
  },
}

// ── Privacy Policy (PDPL) ─────────────────────────────────────────────────
const PRIVACY: Record<Lang, Doc> = {
  ar: {
    title: 'سياسة الخصوصية',
    intro:
      'تشرح هذه السياسة كيف نجمع بياناتك الشخصية ونستخدمها ونحميها ونشاركها وننقلها، وحقوقك تجاهها، وفقًا لنظام حماية البيانات الشخصية في المملكة العربية السعودية ولوائحه التنفيذية. باستخدامك المنصة فإنك تقرّ بأنك اطلعت على هذه السياسة.',
    sections: [
      { h: 'جهة التحكم في البيانات', p: [`جهة التحكم في بياناتك هي ${COMPANY_AR} ولأي استفسار يتعلق بالخصوصية أو لممارسة حقوقك: ${EMAIL}.`] },
      {
        h: 'البيانات التي نجمعها',
        p: [
          'بيانات الهوية والتواصل: الاسم، اسم المستخدم، البريد الإلكتروني، رقم الجوال، الصورة الشخصية (اختيارية).',
          'البيانات الأكاديمية وبيانات الطلبات: التخصص، المرحلة الدراسية، الجهة التعليمية، تفاصيل طلباتك، والملفات والبيانات البحثية التي ترفعها.',
          'بيانات المعاملات: سجل طلباتك وفواتيرك وحالة الدفع. أما بيانات بطاقتك فتعالجها بوابة الدفع مباشرة ولا نطّلع عليها ولا نخزّنها.',
          'المراسلات: رسائلك معنا عبر المنصة أو البريد أو واتساب، وتقييماتك وتعليقاتك.',
          'البيانات التقنية: عنوان IP، نوع الجهاز والمتصفح، أوقات الدخول، وسجلات الأمان.',
          'بيانات التدريب: التسجيل في البرامج، والواجبات والدرجات، وسجل حضور الجلسات، والشهادات الصادرة، وتسجيلات الجلسات المباشرة عند تسجيلها.',
          'سجل الموافقات: موافقتك على الشروط والسياسات، ورقم إصدارها، وتاريخ ووقت الموافقة، ونوع المتصفح.',
          'بيانات الجهات: اسم الجهة وبيانات السجل وبيانات ممثلها المسؤول عن التواصل.',
        ],
      },
      { h: 'مصادر البيانات', p: ['نجمع البيانات منك مباشرة، ومن تسجيل الدخول عبر Google عند اختيارك ذلك، وتلقائيًا من استخدامك المنصة.'] },
      {
        h: 'أغراض المعالجة',
        p: [
          'إنشاء حسابك وإدارته، وتقديم الخدمات والدورات وتنفيذ الطلبات، وإعداد عروض الأسعار والفواتير وتحصيل المبالغ، والتواصل معك بخصوص طلباتك وجلساتك، وإصدار الشهادات والتحقق منها، وتحسين المنصة وحمايتها من الاحتيال وإساءة الاستخدام، والامتثال للالتزامات النظامية، وإرسال رسائل تسويقية متى وافقت عليها (ويمكنك إيقافها في أي وقت).',
          'رقم الجوال: نستخدمه للتواصل معك عبر واتساب أو الاتصال بخصوص حسابك وطلباتك ودوراتك، ولا يظهر إلا لإدارة المنصة، ولا يظهر للمدرّبين أو المستخدمين الآخرين.',
          'سجل الموافقات: نحتفظ به لإثبات موافقتك على الشروط والسياسات وإصداراتها.',
        ],
      },
      { h: 'الأساس النظامي', p: ['نعالج بياناتك بناءً على: موافقتك، أو ضرورة المعالجة لتنفيذ العقد معك، أو التزام نظامي علينا، أو مصلحتنا المشروعة في تشغيل المنصة وتأمينها بما لا يضر بحقوقك.'] },
      {
        h: 'مزوّدو الخدمة ومشاركة البيانات',
        p: [
          'لا نبيع بياناتك ولا نؤجّرها. نشاركها فقط بالقدر اللازم مع: فريق العمل والمختصين المكلّفين بطلبك؛ ومزوّدي الخدمات التقنية الذين يعالجونها نيابة عنا، ومنهم: Supabase (الاستضافة وقواعد البيانات — خوادم في الاتحاد الأوروبي)، وCloudflare (تشغيل الموقع وحمايته — شبكة عالمية)، وGoogle (تسجيل الدخول، وخدمة البريد الإلكتروني، ونماذج الذكاء الاصطناعي Gemini المستخدمة في الترجمة والمساعد الذكي)، وDaily.co (الجلسات المرئية المباشرة)، وبوابات الدفع المعتمدة (مثل ميسّر Moyasar أو Stripe)، وMeta/واتساب (التواصل).',
          'الجهة الراعية لتدريبك: إذا كان تسجيلك في برنامج تعاقدت عليه جهتك (كمستشفى أو جامعة أو مركز تدريب)، نشارك معها بيانات تقدّمك في ذلك البرنامج فقط: الاسم، واسم المستخدم، ونسبة التقدّم، والواجبات المسلّمة، والدرجات، والحضور، والشهادة الصادرة. ولا نشارك معها رسائلك أو ملفاتك أو بياناتك في البرامج الأخرى أو رقم جوالك.',
          'وقد نفصح عن البيانات للجهات الحكومية أو القضائية المختصة متى ألزمنا النظام بذلك.',
        ],
      },
      {
        h: 'نقل البيانات خارج المملكة',
        p: [
          'يقع بعض مزوّدي الخدمات المذكورين خارج المملكة العربية السعودية، وقد تُخزَّن بياناتك أو تُعالَج لديهم. ونقتصر في ذلك على الحد الأدنى من البيانات اللازمة، ونتخذ الضمانات المناسبة وفق أحكام النقل خارج المملكة في نظام حماية البيانات الشخصية ولوائحه. وباستخدامك المنصة توافق على هذا النقل.',
        ],
      },
      { h: 'المساعد الذكي والترجمة', p: ['عند استخدامك المساعد الذكي في المنصة، تُرسل رسائلك إلى نماذج الذكاء الاصطناعي لدى Google لتوليد الرد. ننصحك بعدم إدخال بيانات حساسة أو بيانات تعريفية لأفراد آخرين (كبيانات المرضى) في هذه الرسائل.'] },
      { h: 'البيانات البحثية الحساسة', p: ['إذا تضمنت ملفاتك بيانات صحية أو بيانات مشاركين في بحثك، فأنت مسؤول عن الحصول على الموافقات الأخلاقية اللازمة وعن إزالة البيانات التعريفية قبل رفعها ما أمكن، ونلتزم بعدم استخدامها إلا لتنفيذ طلبك.'] },
      { h: 'ملفات تعريف الارتباط والتخزين المحلي', p: ['نستخدم التخزين المحلي وملفات ضرورية فقط لتشغيل تسجيل الدخول وحفظ تفضيلاتك (كاللغة) وتذكّر رابط الإحالة ومصدر زيارتك الأولى (مثل الإعلان الذي أوصلك) لربطه بطلبك، دون أدوات تتبّع إعلاني من أطراف ثالثة. ويمكنك التحكم بها من إعدادات متصفحك.'] },
      { h: 'أمن البيانات', p: ['نطبّق تدابير تقنية وتنظيمية معقولة، منها التشفير أثناء النقل، والتحكم في الصلاحيات، والتحقق الثنائي لحسابات الإدارة. ومع ذلك لا يمكن ضمان أمان أي نقل عبر الإنترنت بشكل مطلق. وعند وقوع حادثة تسرّب تمس بياناتك نتخذ الإجراءات ونبلغ الجهات المختصة وإياك وفق ما يوجبه النظام.'] },
      { h: 'مدة الاحتفاظ', p: ['نحتفظ ببياناتك طوال نشاط حسابك وبالقدر اللازم لتقديم الخدمة، ونحتفظ بالسجلات المالية والفواتير وسجلات الموافقات للمدد التي توجبها الأنظمة أو التي تلزم لإثبات الحقوق. وتُحفظ تسجيلات الجلسات مدة إتاحة البرنامج ثم تُحذف. وبعد ذلك نتلف البيانات أو نجعلها مجهولة الهوية. ويمكنك طلب حذف حسابك في أي وقت مع مراعاة ما يلزمنا الاحتفاظ به نظامًا.'] },
      { h: 'حقوقك', p: [`لك الحق في: العلم بكيفية معالجة بياناتك، والوصول إليها والحصول على نسخة منها، وطلب تصحيحها أو استكمالها أو تحديثها، وطلب إتلافها متى انتفت الحاجة إليها، والرجوع عن موافقتك، والاعتراض على الرسائل التسويقية. لممارسة أي حق راسلنا على ${EMAIL} وسنرد خلال المدة النظامية. ولك حق تقديم شكوى إلى الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا).`] },
      { h: 'القاصرون', p: ['المنصة موجّهة لمن بلغوا 18 عامًا. ومن هم دون ذلك يستخدمونها بموافقة وليّ الأمر وإشرافه، ولا نجمع بيانات الأطفال عن قصد.'] },
      { h: 'تعديل السياسة', p: ['قد نحدّث هذه السياسة، ونعلن التغييرات الجوهرية عبر المنصة، ويسري التحديث من تاريخ نشره.'] },
    ],
  },
  en: {
    title: 'Privacy Policy',
    intro:
      'This policy explains how we collect, use, protect, share and transfer your personal data, and your rights, under the Saudi Personal Data Protection Law (PDPL) and its regulations. By using the platform you acknowledge this policy.',
    sections: [
      { h: 'Data controller', p: [`The controller is ${COMPANY_EN} Privacy questions and rights requests: ${EMAIL}.`] },
      { h: 'Data we collect', p: ['Identity & contact: name, username, email, mobile number, profile photo (optional).', 'Academic & request data: field, stage, institution, request details, and files and research data you upload.', 'Transactions: your requests, invoices and payment status. Card data is processed by the payment gateway directly; we never see or store it.', 'Communications: your messages via the platform, email or WhatsApp, and your reviews and comments.', 'Technical data: IP address, device and browser type, sign-in times and security logs.', 'Training data: program enrolments, assignments and grades, session attendance, certificates issued, and live-session recordings where sessions are recorded.', 'Consent records: your acceptance of our terms and policies, their version, the date and time, and browser type.', 'Organization data: organization name, registration details and its contact representative’s details.'] },
      { h: 'Sources', p: ['Directly from you, from Google sign-in when you choose it, and automatically from your use of the platform.'] },
      { h: 'Purposes', p: ['Creating and managing your account; providing services and courses; quotes, invoices and payments; communicating about your requests and sessions; issuing and verifying certificates; improving and protecting the platform against fraud and abuse; legal compliance; and marketing messages where you consented (you can opt out at any time).', 'Mobile number: used to contact you by WhatsApp or phone about your account, requests and courses; visible only to the platform admin, never to trainers or other users.', 'Consent records: kept to prove your acceptance of our terms and policies and their versions.'] },
      { h: 'Legal basis', p: ['Your consent, performance of our contract with you, our legal obligations, or our legitimate interest in operating and securing the platform without harming your rights.'] },
      { h: 'Service providers & sharing', p: ['We never sell or rent your data. We share it only as needed with: the team and specialists assigned to your request; and technical providers processing it on our behalf, including Supabase (hosting & database — EU servers), Cloudflare (site delivery & protection — global network), Google (sign-in, email, and Gemini AI models used for translation and the assistant), Daily.co (live video sessions), approved payment gateways (e.g. Moyasar or Stripe), and Meta/WhatsApp (communication).', 'Your sponsoring organization: if you are enrolled in a program your organization contracted (e.g. a hospital, university or training center), we share with it your progress in that program only: name, username, progress, submitted assignments, grades, attendance and certificate. We do not share your messages, files, other programs or mobile number with it.', 'We may disclose data to competent government or judicial authorities where required by law.'] },
      { h: 'Transfers outside Saudi Arabia', p: ['Some of these providers are located outside the Kingdom and your data may be stored or processed there. We limit this to the minimum necessary and apply appropriate safeguards under the PDPL’s cross-border transfer rules. By using the platform you consent to such transfers.'] },
      { h: 'AI assistant & translation', p: ['When you use the in-platform assistant, your messages are sent to Google’s AI models to generate replies. Please do not enter sensitive data or identifying data of others (such as patient data) in those messages.'] },
      { h: 'Sensitive research data', p: ['If your files contain health data or data about your study participants, you are responsible for the required ethical approvals and for de-identifying it before upload where possible; we use it only to perform your request.'] },
      { h: 'Cookies & local storage', p: ['We use local storage and essential files only to run sign-in, save preferences (such as language) and remember a referral link and the source of your first visit (e.g. the ad that brought you) to attach it to your request — no third-party ad tracking. You can control these in your browser.'] },
      { h: 'Security', p: ['We apply reasonable technical and organisational measures, including encryption in transit, access controls and two-step verification for admin accounts. No internet transmission is perfectly secure. If a breach affects your data we take the required steps and notify the authorities and you as the law requires.'] },
      { h: 'Retention', p: ['We keep data while your account is active and as needed to provide services, and keep financial records, invoices and consent records for legally required periods or as needed to establish rights. Session recordings are kept while the program is available, then deleted. Afterwards we destroy or anonymise data. You can ask to delete your account at any time, subject to what we must legally retain.'] },
      { h: 'Your rights', p: [`You may be informed about processing; access and obtain a copy of your data; request correction, completion or updating; request destruction when no longer needed; withdraw consent; and object to marketing. Contact ${EMAIL}; we respond within the statutory period. You may also complain to the Saudi Data & AI Authority (SDAIA).`] },
      { h: 'Minors', p: ['The platform is intended for users aged 18+. Younger users may use it only with a guardian’s consent and supervision; we do not knowingly collect children’s data.'] },
      { h: 'Changes', p: ['We may update this policy and will announce material changes on the platform; updates apply from publication.'] },
    ],
  },
}

// ── Refund & Cancellation Policy ──────────────────────────────────────────
const REFUND: Record<Lang, Doc> = {
  ar: {
    title: 'سياسة الاسترجاع والإلغاء',
    intro:
      'توضح هذه السياسة أحكام الإلغاء والاسترداد لجميع خدماتنا ودوراتنا، وهي جزء لا يتجزأ من الشروط والأحكام. نرجو قراءتها بعناية قبل الدفع؛ فإتمامك الدفع يعني موافقتك عليها.',
    sections: [
      {
        h: 'المبدأ العام: لا يوجد استرجاع بعد الدفع',
        p: [
          'جميع المبالغ المدفوعة نهائية وغير قابلة للاسترداد أو الاستبدال النقدي.',
          'السبب: خدماتنا مخصّصة لكل عميل بحسب طلبه وبياناته، ويبدأ تنفيذها فور الدفع، ونحجز لها وقت المختصين ونرفض طلبات أخرى لأجلها. لذلك فإنك بدفعك توافق صراحةً على البدء الفوري في التنفيذ، وتُقرّ بأن حق الإلغاء يسقط ببدء التنفيذ، وذلك ضمن الاستثناءات التي يقررها نظام التجارة الإلكترونية للخدمات المصمّمة وفق طلب المستهلك والخدمات التي بدأ تنفيذها بموافقته.',
        ],
      },
      { h: 'قبل الدفع', p: ['يمكنك رفض عرض السعر أو إلغاء طلبك مجانًا في أي وقت قبل الدفع، دون أي التزام.'] },
      { h: 'الخدمات البحثية والاستشارية', p: ['لا يُسترد أي مبلغ بعد الدفع، سواء أُنجز العمل كليًا أو جزئيًا، أو عدل العميل عن الطلب، أو غيّر موضوعه أو مشرفه أو جهته، أو تأخر في تزويدنا بالمواد، أو لم يحصل على النتيجة الأكاديمية التي يرجوها.'] },
      { h: 'الدورات والمحتوى الرقمي', p: ['لا يُسترد ثمن الدورة بعد منح الوصول إلى محتواها أو تفعيل رمز الوصول، لأنه محتوى رقمي يُستهلك فور إتاحته.'] },
      { h: 'الجلسات والورش المباشرة', p: ['لا يُسترد ثمن الجلسات أو الورش، ولا تُعوَّض الجلسة التي يتغيب عنها العميل. ويمكن للأفراد إعادة جدولة جلسة واحدة إذا أُبلغنا قبل موعدها بـ24 ساعة على الأقل، وفق التوفر.'] },
      {
        h: 'برامج الجهات والمؤسسات',
        p: [
          'تخضع برامج الجهات لأحكام الإلغاء والاسترداد الواردة في عرض السعر المعتمد أو العقد الموقّع، وتُقدَّم على هذه السياسة عند التعارض.',
          'وما لم ينص عرض السعر أو العقد على خلاف ذلك: لا تُسترد الدفعات المسددة عن أي مرحلة بدأ تنفيذها أو حُجز لها المدرّبون؛ ويجوز إعادة جدولة الجلسات وفق المهلة المحددة في الباقة أو عرض السعر (وفي حال عدم تحديدها: 7 أيام عمل قبل الموعد)؛ ولا تُعوَّض الجلسات التي يُلغيها الطرف الآخر دون الالتزام بهذه المهلة.',
          'تُطبَّق المزايا المذكورة في الباقات (مثل احتساب قيمة الورشة التجريبية من برنامج لاحق خلال المدة المحددة) وفق شروطها، ولا تُستبدل بمبلغ نقدي.',
        ],
      },
      {
        h: 'الحالات الوحيدة للاسترداد',
        p: [
          'يُرد المبلغ فقط في الحالات التالية: (1) الدفع المكرر لنفس الطلب بسبب خطأ تقني، فيُرد المبلغ الزائد؛ (2) اعتذار الشركة عن تنفيذ الطلب لسبب يعود إليها قبل البدء فيه، فيُرد كامل المبلغ؛ (3) أي حالة يوجب فيها نظام سارٍ لا يجوز الاتفاق على خلافه الاسترداد.',
          'وللشركة — وفق تقديرها المطلق ودون أن يُعدّ ذلك التزامًا أو سابقة — أن تعرض بدلًا من الاسترداد رصيدًا أو تحويل المبلغ إلى خدمة أخرى.',
        ],
      },
      {
        h: 'طريقة طلب الاسترداد في الحالات المقبولة ومدته',
        p: [
          `أرسل طلبك إلى ${EMAIL} خلال 7 أيام من تاريخ العملية، مع رقم الطلب أو الفاتورة وإثبات الدفع.`,
          'عند قبول الطلب يُرد المبلغ إلى وسيلة الدفع الأصلية نفسها خلال 14 يوم عمل، وقد يستغرق ظهوره في حسابك مدة إضافية بحسب البنك. ولا تُرد رسوم التحويل البنكي أو رسوم بوابة الدفع غير القابلة للاسترداد متى سمح النظام بذلك.',
        ],
      },
      { h: 'الاعتراض على المدفوعات', p: ['يجب التواصل معنا أولًا قبل الاعتراض على أي عملية لدى البنك. والاعتراض بالمخالفة لهذه السياسة يُعدّ إخلالًا بالشروط، ونقدّم للبنك ما يثبت موافقتك على هذه السياسة وتنفيذ الخدمة.'] },
      { h: 'التسليم', p: ['جميع خدماتنا تُقدَّم وتُسلَّم إلكترونيًا عبر المنصة أو البريد الإلكتروني أو واتساب، ولا توجد منتجات مادية أو شحن أو إرجاع للمنتجات.'] },
      { h: 'الحقوق النظامية', p: ['لا يخلّ ما ورد في هذه السياسة بأي حق نظامي للمستهلك لا يجوز الاتفاق على خلافه.'] },
    ],
  },
  en: {
    title: 'Refund & Cancellation Policy',
    intro:
      'This policy sets out cancellation and refund rules for all our services and courses and forms part of our Terms & Conditions. Please read it carefully before paying; completing payment means you accept it. The Arabic version prevails.',
    sections: [
      { h: 'General rule: no refunds after payment', p: ['All payments are final and non-refundable and cannot be exchanged for cash.', 'Our services are customised to each customer’s request and data, start immediately upon payment, and reserve our specialists’ time. By paying you expressly consent to immediate performance and acknowledge that the right to cancel lapses once performance begins, within the exceptions set by the E-Commerce Law for services made to the consumer’s specification and services begun with their consent.'] },
      { h: 'Before payment', p: ['You may decline a quote or cancel your request free of charge at any time before payment.'] },
      { h: 'Research & consulting services', p: ['No amount is refunded after payment, whether the work is fully or partly completed, or you change your mind, topic, supervisor or institution, delay providing materials, or do not obtain the academic outcome you hoped for.'] },
      { h: 'Courses & digital content', p: ['Course fees are not refunded once access to the content is granted or an access code is activated, as digital content is consumed on access.'] },
      { h: 'Live sessions & workshops', p: ['Session and workshop fees are not refunded, and missed sessions are not compensated. Individuals may reschedule one session with at least 24 hours’ notice, subject to availability.'] },
      { h: 'Organization programs', p: ['Organization programs follow the cancellation and refund terms in the approved quote or signed contract, which prevail over this policy where they conflict.', 'Unless the quote or contract says otherwise: payments for any phase that has started or for which trainers were booked are not refunded; sessions may be rescheduled within the notice set in the package or quote (or, if none, 7 business days before the session); sessions cancelled by the other party without that notice are not made up.', 'Package benefits (such as crediting a pilot workshop toward a later program within the stated period) apply on their stated terms and have no cash value.'] },
      { h: 'The only refund cases', p: ['Refunds apply only to: (1) duplicate payment for the same request due to a technical error — the excess is refunded; (2) the Company declining to perform a request for reasons of its own before starting — the full amount is refunded; (3) any case where non-waivable applicable law requires a refund.', 'The Company may, at its sole discretion and without creating an obligation or precedent, offer a credit or transfer to another service instead.'] },
      { h: 'How to request (eligible cases) & timing', p: [`Email ${EMAIL} within 7 days of the transaction with the request or invoice number and proof of payment.`, 'Approved refunds are returned to the original payment method within 14 business days; your bank may take longer to show it. Non-refundable bank-transfer or gateway fees are not refunded where the law allows.'] },
      { h: 'Payment disputes', p: ['Contact us before disputing a transaction with your bank. A dispute contrary to this policy is a breach of the Terms, and we will provide your bank with proof of your acceptance of this policy and of performance.'] },
      { h: 'Delivery', p: ['All services are provided and delivered electronically via the platform, email or WhatsApp; there are no physical goods, shipping or product returns.'] },
      { h: 'Statutory rights', p: ['Nothing in this policy affects non-waivable statutory consumer rights.'] },
    ],
  },
}

export function TermsPage() {
  const { lang } = useLanguage()
  return <LegalDoc doc={TERMS[lang]} lang={lang} />
}

export function PrivacyPage() {
  const { lang } = useLanguage()
  return <LegalDoc doc={PRIVACY[lang]} lang={lang} />
}

export function RefundPage() {
  const { lang } = useLanguage()
  return <LegalDoc doc={REFUND[lang]} lang={lang} />
}
