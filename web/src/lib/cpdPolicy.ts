/**
 * CPD (continuing professional development) policy — disclosure, conflict of
 * interest, commercial sponsorship, attendance, certificates and complaints —
 * written to the SCFHS standards for CPD providers and activities. Kept apart
 * from legalDocs.ts so it can change without altering the Terms fingerprint.
 */
import { EMAIL, type Doc, type Lang } from '@/lib/legalDocs'

export const CPD_POLICY_VERSION = '2026-10-29'

export const CPD_POLICY: Record<Lang, Doc> = {
  ar: {
    title: 'سياسة الإفصاح وتضارب المصالح والرعاية التجارية',
    intro:
      'تحكم هذه السياسة جميع أنشطة التطوير المهني المستمر (التعليم الطبي المستمر) التي تقدّمها الشركة للممارسين الصحيين، حضوريًا أو عن بُعد، وتلتزم فيها الشركة بمعايير الهيئة السعودية للتخصصات الصحية لاعتماد مقدّمي الأنشطة والأنشطة التعليمية. وتسري على أعضاء اللجنة العلمية والمتحدثين والمدرّبين ومخططي الأنشطة وكل من يتحكم في محتواها.',
    sections: [
      {
        h: 'استقلالية المحتوى العلمي',
        p: [
          'تُخطَّط الأنشطة وتُطوَّر وتُقدَّم باستقلال تام عن أي مصلحة تجارية. وتتولى لجنة علمية لا يقل عدد أعضائها عن اثنين مسؤولية: تحديد الاحتياجات التعليمية للفئة المستهدفة، وصياغة الأهداف التعليمية، واختيار أساليب التعلم، واختيار المتحدثين والمدرّبين، واعتماد المحتوى العلمي، وتقييم مخرجات النشاط.',
          'يُبنى المحتوى على أفضل الممارسات المقبولة والأدلة العلمية الحديثة، ولا يُسمح لأي جهة تجارية بالتأثير — بشكل مباشر أو غير مباشر — في المحتوى أو أساليب التعلم أو اختيار المتحدثين.',
        ],
      },
      {
        h: 'الإفصاح عن العلاقات المالية',
        p: [
          'يلتزم كل من يتحكم في محتوى النشاط (أعضاء اللجنة العلمية، والمتحدثون، والمدرّبون، والمخططون) بالإفصاح كتابيًا للشركة عن أي علاقة مالية ذات صلة بجهة تجارية خلال الأشهر الأربعة والعشرين السابقة للنشاط، قبل اعتماد مشاركته.',
          'يتضمن الإفصاح: اسم الشخص، واسم الجهة التجارية، وطبيعة العلاقة (مثل: منحة بحثية، أتعاب استشارية، عضوية مجلس استشاري، متحدث مدفوع الأجر، ملكية أسهم).',
          'يُعرض الإفصاح على المشاركين قبل بداية النشاط، في صفحة النشاط على المنصة وفي بدايته. وإذا لم توجد علاقة يُذكر ذلك صراحة.',
          'يُعدّ الامتناع عن الإفصاح أو تقديم إفصاح غير صحيح سببًا لاستبعاد الشخص من النشاط.',
        ],
      },
      {
        h: 'إدارة تضارب المصالح',
        p: [
          'تراجع اللجنة العلمية كل إفصاح قبل النشاط، فإذا وُجد تضارب مصالح تتخذ إجراءً أو أكثر مما يلي: إسناد الموضوع المرتبط بالتضارب إلى متحدث آخر، أو مراجعة المحتوى مراجعة مستقلة من عضو لا تضارب لديه، أو حصر مشاركة الشخص في موضوعات لا صلة لها بالجهة التجارية، أو استبعاده من النشاط.',
          'لا يجوز لمن لديه تضارب مصالح لم يُعالَج أن يشارك في التخطيط للنشاط أو تقديمه.',
        ],
      },
      {
        h: 'الرعاية التجارية',
        p: [
          'لا تُقبل أي رعاية تجارية إلا باتفاق مكتوب يقرّ فيه الراعي بأنه لا يؤثر في محتوى النشاط أو أساليبه أو متحدثيه.',
          'يُفصَح عن كل رعاية تجارية للمشاركين المحتملين في صفحة النشاط وفي مواده الترويجية. وإذا لم توجد رعاية يُذكر ذلك.',
          'لا يُسمح للراعي باستخدام النشاط للإعلان: فلا إعلانات أو ترويج لمنتجات داخل المحتوى التعليمي أو المواد أو العروض، وتُستخدم الأسماء العلمية بدل الأسماء التجارية قدر الإمكان.',
          'تُدار أموال الرعاية — إن وُجدت — عبر الشركة وحدها، ولا تُدفع مباشرة للمتحدثين أو المدرّبين.',
        ],
      },
      {
        h: 'الترويج للأنشطة',
        p: [
          'تعرض المواد الترويجية لكل نشاط: الفئة المستهدفة، والأهداف التعليمية، والمتحدثين، والإفصاحات، والرعاية إن وُجدت.',
          'لا يُذكر عدد ساعات التعليم المستمر ولا رقم الاعتماد ولا شعار الهيئة السعودية للتخصصات الصحية إلا بعد صدور اعتماد النشاط رسميًا، وبالصيغة التي تحددها الهيئة.',
        ],
      },
      {
        h: 'الأخلاقيات وحماية البيانات وحقوق النشر',
        p: [
          'يلتزم المحتوى بأخلاقيات المهنة، بما في ذلك الحصول على موافقة المريض عند استخدام أي حالة أو صورة سريرية، وإخفاء كل ما يدل على هويته، والالتزام بنظام حماية البيانات الشخصية.',
          'يلتزم المتحدثون والمدرّبون بحقوق النشر والملكية الفكرية، وبالإشارة إلى المصادر.',
        ],
      },
      {
        h: 'التسجيل والتحقق من الحضور',
        p: [
          'يسجّل الممارس الصحي في النشاط بحسابه على المنصة، ويُطلب منه رقم تسجيله المهني في الهيئة لاحتساب الساعات. وتُحفظ بياناته بسرية، ولا يطّلع عليها إلا هو وإدارة التعليم المستمر.',
          'تتحقق المنصة إلكترونيًا من المشاركة: سجلات الدخول، ونسبة إكمال المحتوى والجلسات، وحضور الجلسات المباشرة.',
        ],
      },
      {
        h: 'التقييم والشهادات',
        p: [
          'يُتاح للمشارك تقييم جودة كل جلسة وجودة النشاط ككل، وتُقاس مخرجات التعلم بأدوات مناسبة للأهداف، مثل الاختبار القبلي والبعدي.',
          'لا تُصدر الشهادة إلا بعد استيفاء متطلبات الحضور والتقييم ونسبة النجاح المحددة في صفحة النشاط. وكل شهادة تحمل رقمًا ورمز QR للتحقق منها على المنصة.',
          'تحتفظ الشركة بسجلات الحضور والتقييم والإفصاحات وتقييم الاحتياج مدة لا تقل عن خمس سنوات، وتزوّد بها الهيئة عند الطلب.',
        ],
      },
      {
        h: 'الشكاوى والتظلمات',
        p: [
          `للمشارك تقديم شكوى أو تظلّم بخصوص أي نشاط (المحتوى، أو الحضور، أو التقييم، أو الشهادة) عبر البريد ${EMAIL} خلال 30 يومًا من انتهاء النشاط.`,
          'نؤكد استلام الشكوى خلال 3 أيام عمل، ونرد بقرار مسبب خلال 10 أيام عمل. ويحق للمشارك تصعيد الشكوى إلى مدير التعليم المستمر، الذي يبتّ فيها خلال 10 أيام عمل أخرى.',
          'لا يخلّ ذلك بحق المشارك في التواصل مع الهيئة السعودية للتخصصات الصحية.',
        ],
      },
      {
        h: 'مراجعة السياسة',
        p: ['تراجع إدارة التعليم المستمر هذه السياسة سنويًا على الأقل، وكلما صدرت معايير جديدة من الهيئة.'],
      },
    ],
  },
  en: {
    title: 'Disclosure, Conflict of Interest & Commercial Support Policy',
    intro:
      'This policy governs all continuing professional development (CME/CPD) activities the Company offers to healthcare practitioners, in person or online, in line with the Saudi Commission for Health Specialties (SCFHS) standards for CPD providers and activities. It applies to scientific committee members, speakers, trainers, planners and anyone in control of activity content. The Arabic version prevails.',
    sections: [
      {
        h: 'Independence of scientific content',
        p: [
          'Activities are planned, developed and delivered independently of any commercial interest. A scientific planning committee of at least two members is responsible for identifying learning needs, writing learning objectives, choosing learning methods, selecting speakers and trainers, approving scientific content and evaluating outcomes.',
          'Content is based on current evidence and accepted best practice. No commercial entity may influence, directly or indirectly, the content, methods or choice of speakers.',
        ],
      },
      {
        h: 'Disclosure of financial relationships',
        p: [
          'Everyone in control of content (committee members, speakers, trainers, planners) must disclose in writing to the Company any relevant financial relationship with a commercial interest in the 24 months before the activity, before their participation is approved.',
          'Each disclosure states the person’s name, the commercial interest’s name and the nature of the relationship (e.g. research grant, consulting fees, advisory board, paid speaker, shareholding).',
          'Disclosures are shown to learners before the activity begins, on the activity page and at its start. Where there is no relationship, that is stated explicitly.',
          'Failure to disclose, or an inaccurate disclosure, is grounds for removal from the activity.',
        ],
      },
      {
        h: 'Managing conflicts of interest',
        p: [
          'The scientific committee reviews every disclosure before the activity. Where a conflict exists it will: reassign the related topic to another speaker, have the content independently reviewed by a member without a conflict, limit the person to unrelated topics, or remove them from the activity.',
          'No one with an unresolved conflict may plan or deliver an activity.',
        ],
      },
      {
        h: 'Commercial sponsorship',
        p: [
          'Sponsorship is accepted only under a written agreement in which the sponsor acknowledges it has no influence on content, methods or speakers.',
          'All commercial sponsorship is disclosed to prospective participants on the activity page and in promotional materials; where there is none, that is stated.',
          'Sponsors may not use the activity for advertising: no advertisements or product promotion within educational content, materials or slides, and generic names are used instead of trade names wherever possible.',
          'Any sponsorship funds are managed by the Company only and are never paid directly to speakers or trainers.',
        ],
      },
      {
        h: 'Promotion of activities',
        p: [
          'Promotional materials for each activity show the target audience, learning objectives, speakers, disclosures and any sponsorship.',
          'CPD hours, the accreditation number and the SCFHS logo are shown only after the activity is officially accredited, in the form SCFHS specifies.',
        ],
      },
      {
        h: 'Ethics, data protection & copyright',
        p: [
          'Content follows professional ethics, including patient consent for any clinical case or image, removal of identifying details, and the Personal Data Protection Law.',
          'Speakers and trainers respect copyright and intellectual property and cite their sources.',
        ],
      },
      {
        h: 'Registration & attendance verification',
        p: [
          'Practitioners register through their platform account and are asked for their SCFHS registration number to record hours. This data is kept confidential and visible only to them and CPD management.',
          'The platform verifies participation electronically: sign-in records, completion of content and sessions, and attendance at live sessions.',
        ],
      },
      {
        h: 'Evaluation & certificates',
        p: [
          'Participants can evaluate each session and the activity as a whole, and learning is measured with tools suited to the objectives, such as pre- and post-tests.',
          'A certificate is issued only after the attendance, evaluation and pass-mark requirements stated on the activity page are met. Every certificate carries a number and a QR code verifiable on the platform.',
          'The Company keeps attendance, evaluation, disclosure and needs-assessment records for at least five years and provides them to SCFHS on request.',
        ],
      },
      {
        h: 'Complaints & appeals',
        p: [
          `Participants may raise a complaint or appeal about any activity (content, attendance, evaluation or certificate) at ${EMAIL} within 30 days of the activity ending.`,
          'We acknowledge within 3 business days and give a reasoned decision within 10 business days. The participant may escalate to the CPD manager, who decides within a further 10 business days.',
          'This does not affect the participant’s right to contact SCFHS.',
        ],
      },
      {
        h: 'Policy review',
        p: ['CPD management reviews this policy at least annually and whenever SCFHS issues new standards.'],
      },
    ],
  },
}
