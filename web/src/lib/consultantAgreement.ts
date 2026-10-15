import { supabase } from '@/lib/supabase'
import { COMPANY_AR, COMPANY_EN, EMAIL, type Doc, type Lang } from '@/lib/legalDocs'

/**
 * The Trainer Agreement every collaborator (role 'teacher') must
 * accept before any request can be assigned to them. Acceptance is a
 * consent_events row (kind 'consultant_agreement', terms_version = this
 * version, doc_hash = SHA-256 of this text) — see migration 0079, which also
 * blocks assignment server-side.
 *
 * Bumping the version: change CONSULTANT_AGREEMENT_VERSION here AND in
 * public.consultant_agreement_version() (a new migration), so everyone
 * re-accepts before getting new requests. Since 0081 the DB accepts any
 * acceptance of the required version or newer.
 */
export const CONSULTANT_AGREEMENT_VERSION = '2026-10-15'

export const CONSULTANT_AGREEMENT: Record<Lang, Doc> = {
  ar: {
    title: 'اتفاقية المدرّب',
    intro:
      'تنظّم هذه الاتفاقية («الاتفاقية») العلاقة بين الشركة وبين كل مدرّب يقدّم من خلالها خدمات بحثية أو استشارية أو تدريبية لعملائها. وبضغطك على «أوافق» فإنك تقرّ بأنك قرأتها وفهمتها ووافقت عليها موافقةً ملزمة، ولا يُسند إليك أي طلب قبل هذه الموافقة. وتسري الشروط والأحكام العامة للمنصة وسياسة الخصوصية فيما لم يرد فيه نص في هذه الاتفاقية.',
    sections: [
      {
        h: 'الأطراف',
        p: [
          `الطرف الأول: ${COMPANY_AR} ويُشار إليها بـ«الشركة».`,
          'الطرف الثاني: صاحب الحساب الموافق على هذه الاتفاقية، ويُشار إليه بـ«المدرّب»، سواء قدّم خدمات بحثية واستشارية أو دورات وبرامج تدريبية.',
          '«العميل»: كل فرد أو جهة تعرّف عليه المدرّب أو قدّم له خدمة من خلال الشركة أو منصتها. «الطلب»: كل خدمة تُسندها الشركة إلى المدرّب. «المخرجات»: كل ما يُعدّه المدرّب أو يسلّمه في إطار أي طلب أو برنامج.',
        ],
      },
      {
        h: 'صفة التعاقد',
        p: [
          'المدرّب متعاون مستقل، وليست بين الطرفين علاقة عمل أو تبعية أو وكالة أو شراكة. ولا يستحق المدرّب أجرًا ثابتًا أو ساعات عمل محددة أو أي مزايا وظيفية، ويُدفع له مقابل كل طلب وفق بند المستحقات.',
          'يقرّ المدرّب بأنه مؤهل نظامًا لتقديم الخدمات وتلقي مقابلها: فإن كان مقيمًا في المملكة فعليه الحصول على ما يلزم نظامًا (مثل وثيقة العمل الحر أو سجل تجاري، أو موافقة صاحب العمل والوسيلة النظامية المعتمدة إن كان يعمل لدى جهة أخرى)، وإن كان مقيمًا خارج المملكة فهو مسؤول عن التزاماته النظامية والضريبية في بلده. ويتحمل المدرّب وحده أي تبعة تنشأ عن إخلاله بذلك.',
          'لا يجوز للمدرّب التعاقد أو الالتزام أو تقديم أي وعد للعميل باسم الشركة خارج نطاق الطلب المسند إليه.',
        ],
      },
      {
        h: 'الإسناد ونطاق العمل',
        p: [
          'لا تلتزم الشركة بإسناد حد أدنى من الطلبات. ويحق للمدرّب الاعتذار عن أي طلب خلال 24 ساعة من إسناده، وبعد قبوله يلتزم بتنفيذه كاملًا.',
          'يلتزم المدرّب بنطاق الطلب ومواعيده ومستوى الجودة المتفق عليه، وبإبلاغ الإدارة فورًا بأي عائق قد يؤخر التسليم. وأي تغيير في النطاق أو السعر أو الموعد يتم عن طريق الإدارة فقط.',
          'يلتزم المدرّب بتنفيذ جولات التعديل المنصوص عليها في شروط العملاء ضمن النطاق المتفق عليه، دون مقابل إضافي.',
        ],
      },
      {
        h: 'النزاهة الأكاديمية والمهنية',
        p: [
          'دور المدرّب تعليمي وإرشادي واستشاري: يشرح ويوجّه ويراجع ويحرّر ويحلّل ويدرّب. ولا يجوز له كتابة بحث أو رسالة أو واجب نيابةً عن الطالب ليقدّمه باسمه على أنه عمل أصلي له، ولا اختلاق البيانات أو النتائج أو المراجع أو التلاعب بها.',
          'يلتزم المدرّب بإبلاغ الإدارة عن أي طلب يرى أنه يخالف الأنظمة أو أخلاقيات البحث العلمي أو سياسات النزاهة الأكاديمية، ويحق له الامتناع عن تنفيذ ذلك الجزء.',
          'يضمن المدرّب أن عمله أصلي، ولا ينتهك حقوق الملكية الفكرية للغير، ولا يتضمن انتحالًا.',
        ],
      },
      {
        h: 'التواصل داخل المنصة فقط',
        p: [
          'يكون كل تواصل مع العميل بخصوص أي طلب أو برنامج عبر المنصة أو القنوات التي تحددها الشركة فقط. ويُحظر على المدرّب طلب وسائل تواصل العميل أو مشاركة وسائل تواصله معه أو دعوته للتواصل خارج المنصة.',
          'يقرّ المدرّب بعلمه أن إدارة المنصة تطّلع على المحادثات، وأن النظام يحجب أرقام الهواتف والبريد الإلكتروني والروابط الخارجية آليًا ويحتفظ بالنص الأصلي لأغراض الإثبات، وأن بيانات تواصل العملاء لا تظهر له.',
        ],
      },
      {
        h: 'عدم الاستقطاب والتعويض الاتفاقي',
        p: [
          'يلتزم المدرّب، طوال مدة التعاون ولمدة اثني عشر (12) شهرًا من آخر تعامل له مع العميل عبر الشركة، بعدم تقديم أي خدمة من الطبيعة ذاتها لأي عميل تعرّف عليه من خلال الشركة أو منصتها، مباشرةً أو عن طريق الغير، بمقابل أو دونه، وبعدم توجيه العميل إلى جهة منافسة، إلا بموافقة الشركة الكتابية. ويشمل ذلك عملاء الجهات ومنسوبيها.',
          'عند الإخلال بهذا البند يلتزم المدرّب بأن يدفع للشركة تعويضًا اتفاقيًا عن كل مخالفة يعادل ضعف ما حصل عليه من العميل خارج الشركة أو عشرة آلاف (10,000) ريال سعودي، أيهما أكبر، دون إخلال بحق الشركة في المطالبة بما يزيد عليه من ضرر، وفي إنهاء التعاون فورًا، وفي إجراء المقاصة بين هذا التعويض وأي مستحقات له.',
        ],
      },
      {
        h: 'السرية وحماية البيانات الشخصية',
        p: [
          'يُعدّ المدرّب جهة معالجة تعالج البيانات الشخصية نيابةً عن الشركة وفق نظام حماية البيانات الشخصية. فلا يعالج بيانات العملاء أو ملفاتهم إلا بالقدر اللازم لتنفيذ الطلب المسند إليه ووفق تعليمات الشركة، ولا يستخدمها لأي غرض آخر ولا يفصح عنها لأي طرف.',
          'لا ينزّل المدرّب ملفات العميل خارج المنصة إلا عند الضرورة لتنفيذ العمل، ويحفظها في جهاز محمي بكلمة مرور، ويتلف كل نسخة لديه خلال سبعة (7) أيام من التسليم النهائي، ولا يحتفظ بأي نسخة بعد ذلك.',
          'لا يُدخل المدرّب أي بيانات تعريفية أو بيانات صحية أو بيانات مشاركين في أي أداة أو خدمة خارجية (بما فيها أدوات الذكاء الاصطناعي) دون إزالة البيانات التعريفية منها وموافقة الشركة المسبقة.',
          'يلتزم المدرّب بإبلاغ الشركة فورًا، وخلال أربع وعشرين (24) ساعة كحد أقصى، بأي فقدان أو تسرّب أو وصول غير مصرح به لبيانات العملاء، وبالتعاون في احتوائه. ولا يحاول الوصول إلى بيانات تواصل العملاء أو أي بيانات لا تلزمه.',
          'يسري التزام السرية على كل معلومة غير عامة عن العملاء أو الشركة أو أسعارها أو أساليب عملها، ويبقى نافذًا بعد انتهاء التعاون دون حد زمني.',
        ],
      },
      {
        h: 'الملكية الفكرية',
        p: [
          'تؤول إلى الشركة جميع الحقوق المالية في المخرجات التي يُعدّها المدرّب في إطار أي طلب، بمجرد إنشائها ومقابل المستحقات المتفق عليها، وتتولى الشركة تسليمها للعميل وفق شروطها، وذلك في الحدود التي يسمح بها النظام ومع بقاء الحقوق الأدبية للمدرّب التي لا يجوز التنازل عنها.',
          'المواد والمحتوى الذي يُعدّه المدرّب لدورات الشركة وبرامجها مملوكة للشركة، ما لم يُتفق كتابيًا على غير ذلك.',
          'لا يجوز للمدرّب إعادة استخدام مخرجات أي عميل أو نشرها أو عرضها في أعماله السابقة دون موافقة كتابية من الشركة. ويحتفظ المدرّب بمعارفه وخبراته العامة.',
        ],
      },
      {
        h: 'المستحقات',
        p: [
          'تحدد الشركة مقابل المدرّب لكل طلب قبل البدء فيه أو عند إسناده، ويظهر في لوحة المدرّب. ولا تُطّلع العملاء على هذا المقابل.',
          'تُستحق المستحقات بعد سداد العميل كامل مبلغ الطلب واستلامه المخرجات، وتُصرف خلال أربعة عشر (14) يومًا من ذلك بالتحويل البنكي إلى حساب المدرّب المسجّل.',
          'لا يستحق المدرّب مقابلًا عن عمل لم يُكمله أو رُفض لسبب يعود إليه، ويُخفض المقابل بنسبة ما رُدّ إلى العميل إذا كان الرد بسبب إخفاق المدرّب أو تأخره.',
          'يلتزم المدرّب بتزويد الشركة بفاتورة أو سند استلام عن كل دفعة. وإذا كان مقيمًا خارج المملكة، فقد تُستقطع من مستحقاته ضريبة الاستقطاع وفق الأنظمة السارية. ويتحمل المدرّب رسوم التحويل البنكي الخاصة به.',
        ],
      },
      {
        h: 'المسؤولية والتعويض',
        p: [
          'يتحمل المدرّب المسؤولية عن الأضرار الناشئة عن إخلاله بالسرية أو حماية البيانات أو النزاهة الأكاديمية أو حقوق الغير أو عن الإهمال الجسيم، ويلتزم بتعويض الشركة عن أي مطالبات أو خسائر أو تكاليف تنشأ عن ذلك (بما فيها أتعاب المحاماة المعقولة).',
        ],
      },
      {
        h: 'المدة والإنهاء',
        p: [
          'تسري الاتفاقية من تاريخ قبولها، ويجوز لأي طرف إنهاء التعاون بإشعار كتابي عبر المنصة أو البريد الإلكتروني. وعند الإنهاء يُكمل المدرّب الطلبات القائمة أو يسلّم ما أُنجز منها وكل ما يتعلق بها وفق تعليمات الشركة، ويُحتسب مقابله عن الجزء المنجز المقبول.',
          'يحق للشركة إيقاف الإسناد أو إنهاء التعاون فورًا عند إخلال المدرّب بأي بند جوهري، ولا سيما بنود التواصل وعدم الاستقطاب والسرية والنزاهة.',
          'تبقى بنود السرية وحماية البيانات وعدم الاستقطاب والتعويض الاتفاقي والملكية الفكرية والمسؤولية نافذة بعد انتهاء التعاون.',
        ],
      },
      {
        h: 'القبول الإلكتروني والسجلات',
        p: [
          'يُعدّ ضغط المدرّب على «أوافق» قبولًا إلكترونيًا صريحًا له حجية التوقيع الخطي وفق نظام التعاملات الإلكترونية. وتحتفظ الشركة بسجل القبول متضمنًا رقم الإصدار والبصمة الرقمية لنص الاتفاقية وتاريخ ووقت القبول وعنوان IP ونوع المتصفح، ويُعدّ حجة في الإثبات.',
          'يحق للشركة تعديل الاتفاقية، ولا يُسند للمدرّب أي طلب جديد بعد التعديل إلا بعد قبوله الإصدار الجديد. ولا يؤثر التعديل على الطلبات المسندة قبله.',
        ],
      },
      {
        h: 'النظام الواجب التطبيق',
        p: [
          'تخضع الاتفاقية لأنظمة المملكة العربية السعودية، ويسعى الطرفان لحل أي خلاف وديًا خلال 30 يومًا، فإن تعذّر ذلك تختص المحاكم المختصة في مدينة جدة. وتسود النسخة العربية عند الاختلاف مع ترجمتها.',
          `للتواصل بشأن الاتفاقية: ${EMAIL}`,
        ],
      },
    ],
  },
  en: {
    title: 'Trainer Agreement',
    intro:
      'This Agreement governs the relationship between the Company and every trainer who provides research, consulting or training services to its customers through it. By clicking “I agree” you confirm you have read, understood and agreed to be bound by it; no request is assigned to you before this acceptance. The platform’s general Terms and Privacy Policy apply to anything this Agreement does not cover. The Arabic version prevails.',
    sections: [
      { h: 'Parties', p: [`First party: ${COMPANY_EN} (the “Company”).`, 'Second party: the account holder accepting this Agreement (the “Trainer”), whether providing research and consulting services or delivering courses and training programs.', '“Customer”: any individual or organization he Trainer met or served through the Company or its platform. “Request”: any service the Company assigns to he Trainer. “Deliverables”: everything he Trainer prepares or delivers under any request or program.'] },
      { h: 'Nature of the relationship', p: ['he Trainer is an independent collaborator; there is no employment, subordination, agency or partnership between the parties. he Trainer is not entitled to a fixed wage, set hours or employee benefits, and is paid per request under the Payouts section.', 'he Trainer confirms they are legally permitted to provide the services and receive payment: if resident in the Kingdom, they must hold what the law requires (such as a freelance certificate or commercial registration, or their employer’s approval and the approved legal channel if employed elsewhere); if resident abroad, they are responsible for their legal and tax obligations there. he Trainer alone bears any consequence of failing to do so.', 'he Trainer may not contract, commit or promise anything to a customer on the Company’s behalf beyond the assigned request.'] },
      { h: 'Assignment & scope', p: ['The Company does not guarantee a minimum number of requests. he Trainer may decline a request within 24 hours of assignment; once accepted, they must complete it.', 'he Trainer must follow the request’s scope, deadlines and agreed quality, and inform the administration immediately of anything that may delay delivery. Any change to scope, price or deadline goes through the administration only.', 'he Trainer will carry out the revision rounds set in the customer terms, within the agreed scope, at no extra charge.'] },
      { h: 'Academic & professional integrity', p: ['he Trainer’s role is educational, mentoring and consulting: explaining, guiding, reviewing, editing, analysing and training. They may not write a research paper, thesis or assignment for a student to submit in their name as original work, nor fabricate or manipulate data, results or references.', 'he Trainer must report to the administration any request they consider unlawful or contrary to research ethics or academic-integrity policies, and may decline that part.', 'he Trainer warrants their work is original, does not infringe third-party intellectual property and contains no plagiarism.'] },
      { h: 'Communication on the platform only', p: ['All communication with a customer about any request or program takes place on the platform or the channels the Company designates. he Trainer may not ask for a customer’s contact details, share their own, or invite the customer to communicate off the platform.', 'he Trainer acknowledges that the administration can access chats, that the system automatically masks phone numbers, emails and outside links and keeps the original text as evidence, and that customers’ contact details are not shown to them.'] },
      { h: 'Non-solicitation & liquidated damages', p: ['During the collaboration and for twelve (12) months after their last dealing with a customer through the Company, he Trainer will not provide services of the same nature to any customer met through the Company or its platform, directly or through others, paid or unpaid, nor steer the customer to a competitor, without the Company’s written consent. This includes organization customers and their staff.', 'For each breach of this clause he Trainer will pay the Company liquidated damages equal to twice what they received from the customer outside the Company or ten thousand (10,000) Saudi riyals, whichever is greater, without prejudice to the Company’s right to claim further damage, to end the collaboration immediately, and to set this amount off against any payouts due.'] },
      { h: 'Confidentiality & personal data', p: ['he Trainer acts as a processor of personal data on the Company’s behalf under the Personal Data Protection Law. They process customers’ data and files only as needed to perform the assigned request and on the Company’s instructions, use them for no other purpose and disclose them to no one.', 'he Trainer downloads customer files off the platform only when necessary to do the work, keeps them on a password-protected device, destroys every copy within seven (7) days of final delivery and keeps no copy afterwards.', 'he Trainer will not enter any identifying, health or study-participant data into any outside tool or service (including AI tools) without de-identifying it and the Company’s prior approval.', 'he Trainer must notify the Company immediately, and within twenty-four (24) hours at most, of any loss, leak or unauthorized access to customer data, and cooperate in containing it. They will not try to access customers’ contact details or any data they do not need.', 'Confidentiality covers all non-public information about customers, the Company, its prices and methods, and survives the end of the collaboration without time limit.'] },
      { h: 'Intellectual property', p: ['All economic rights in deliverables he Trainer prepares under any request vest in the Company as soon as they are created, in return for the agreed payout; the Company delivers them to the customer under its terms, to the extent permitted by law and subject to he Trainer’s non-waivable moral rights.', 'Materials and content the Trainer prepares for the Company’s courses and programs belong to the Company unless otherwise agreed in writing.', 'he Trainer may not reuse, publish or showcase any customer’s deliverables without the Company’s written consent. he Trainer keeps their general knowledge and expertise.'] },
      { h: 'Payouts', p: ['The Company sets he Trainer’s payout for each request before work starts or on assignment, and it is shown in he Trainer’s dashboard. Customers never see it.', 'Payouts become due once the customer has paid the request in full and received the deliverables, and are paid within fourteen (14) days of that by bank transfer to he Trainer’s registered account.', 'No payout is due for work not completed or rejected for reasons attributable to he Trainer, and the payout is reduced in proportion to any amount refunded to the customer because of he Trainer’s failure or delay.', 'he Trainer will provide an invoice or receipt for each payment. If resident outside the Kingdom, withholding tax may be deducted under applicable law. he Trainer bears their own bank-transfer fees.'] },
      { h: 'Liability & indemnity', p: ['he Trainer is liable for damage caused by breach of confidentiality, data protection, academic integrity or third-party rights, or by gross negligence, and will indemnify the Company against any resulting claims, losses or costs (including reasonable legal fees).'] },
      { h: 'Term & termination', p: ['This Agreement applies from acceptance; either party may end the collaboration by written notice via the platform or email. On termination he Trainer completes ongoing requests or hands over the work done and everything related to it as the Company instructs, and is paid for the accepted completed part.', 'The Company may stop assignments or end the collaboration immediately if he Trainer breaches any material clause, especially communication, non-solicitation, confidentiality and integrity.', 'Confidentiality, data protection, non-solicitation, liquidated damages, intellectual property and liability survive the end of the collaboration.'] },
      { h: 'Electronic acceptance & records', p: ['Clicking “I agree” is express electronic acceptance with the effect of a handwritten signature under the Electronic Transactions Law. The Company keeps a record of the acceptance including the version, the digital fingerprint of the Agreement text, the date and time, IP address and browser type, which constitutes evidence.', 'The Company may amend this Agreement; after an amendment no new request is assigned until he Trainer accepts the new version. Amendments do not affect requests assigned before them.'] },
      { h: 'Governing law', p: ['This Agreement is governed by the laws of the Kingdom of Saudi Arabia. The parties will try to settle any dispute amicably within 30 days; failing that, the competent courts in Jeddah have jurisdiction. The Arabic version prevails over any translation.', `Contact about this Agreement: ${EMAIL}`] },
    ],
  },
}

let hashPromise: Promise<string> | null = null

/** SHA-256 (hex) of the agreement text, both languages — stored with each acceptance. */
export function consultantAgreementHash(): Promise<string> {
  hashPromise ??= (async () => {
    const text = JSON.stringify({ version: CONSULTANT_AGREEMENT_VERSION, agreement: CONSULTANT_AGREEMENT })
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
  })()
  return hashPromise
}

/** true / false, or undefined when migration 0079 is pending (kind not allowed yet → gate stays hidden). */
export async function hasAcceptedConsultantAgreement(userId: string): Promise<boolean | undefined> {
  // 0079 not applied → agreement not enforced yet, keep the gate hidden.
  const { error: verErr } = await supabase.rpc('consultant_agreement_version')
  if (verErr) return undefined
  // Checked against THIS app version (not the DB's), so accepting a newly
  // published text never loops even before the matching migration runs.
  const { data, error } = await supabase
    .from('consent_events')
    .select('id')
    .eq('user_id', userId)
    .eq('kind', 'consultant_agreement')
    .eq('terms_version', CONSULTANT_AGREEMENT_VERSION)
    .limit(1)
  if (error) return undefined
  return (data ?? []).length > 0
}

export async function acceptConsultantAgreement(userId: string) {
  const { error } = await supabase.from('consent_events').insert({
    user_id: userId,
    kind: 'consultant_agreement',
    ref: `consultant-agreement:${CONSULTANT_AGREEMENT_VERSION}`,
    terms_version: CONSULTANT_AGREEMENT_VERSION,
    doc_hash: await consultantAgreementHash(),
    user_agent: navigator.userAgent.slice(0, 300),
  })
  if (error) throw error
}

/** Owner: ids of consultants who accepted the current version (null when 0079 is pending). */
export async function listAgreementSigners(): Promise<Set<string> | null> {
  // Before 0079 the agreement isn't enforced yet — report "unknown", not "nobody signed".
  const { error: verErr } = await supabase.rpc('consultant_agreement_version')
  if (verErr) return null
  const { data, error } = await supabase
    .from('consent_events')
    .select('user_id')
    .eq('kind', 'consultant_agreement')
    .eq('terms_version', CONSULTANT_AGREEMENT_VERSION)
  if (error) return null
  return new Set((data ?? []).map((r) => r.user_id as string))
}
