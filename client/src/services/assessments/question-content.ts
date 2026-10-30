import type { Competency, QuestionDifficulty, QuestionType } from '@shared/constants'

/**
 * The original question bank for the Pre and Post assessments (SPEC §6): 24 shared items, each
 * with an English and an Arabic variant. Option keys are A to D by position and are shared by both
 * languages, so a correct key means the same thing in each. Original demonstration content, not
 * Qatar Tourism policy. Points: single 1, multiple 2 (all correct options and none wrong),
 * scenario 2.
 */

export interface QuestionVariantText {
  prompt: string
  options: readonly [string, string, string, string]
  feedback: string
}

export interface QuestionContent {
  /** Short code, e.g. DN-001. The shared id is `QS-<code>`, variants `Q-<code>-EN` and `-AR`. */
  code: string
  competency: Competency
  difficulty: QuestionDifficulty
  type: QuestionType
  correct: readonly string[]
  en: QuestionVariantText
  ar: QuestionVariantText
}

export const POINTS_BY_TYPE: Record<QuestionType, number> = {
  single: 1,
  multiple: 2,
  scenario: 2,
}

export const QUESTION_CONTENT: readonly QuestionContent[] = [
  // --- Discover needs ---------------------------------------------------------------------
  {
    code: 'DN-001',
    competency: 'discover_needs',
    difficulty: 'easy',
    type: 'scenario',
    correct: ['B'],
    en: {
      prompt: 'A visitor asks for an activity suitable for their family. What should you do first?',
      options: [
        'Assume every family wants the same activity',
        'Ask about their interests and practical needs',
        'Recommend only the most expensive option',
        'Ignore the request',
      ],
      feedback:
        'Personalise the recommendation before suggesting options. Asking about interests and practical needs lets you match the activity to this family.',
    },
    ar: {
      prompt: 'يسأل أحد الزوّار عن نشاط يناسب عائلته. ما الذي يجب أن تفعله أولًا؟',
      options: [
        'افتراض أن جميع العائلات تفضّل النشاط نفسه',
        'السؤال عن اهتماماتهم واحتياجاتهم العملية',
        'ترشيح الخيار الأغلى فقط',
        'تجاهل الطلب',
      ],
      feedback:
        'خصّص التوصية قبل اقتراح الخيارات. فالسؤال عن الاهتمامات والاحتياجات العملية يساعدك على اختيار النشاط الأنسب لهذه العائلة.',
    },
  },
  {
    code: 'DN-002',
    competency: 'discover_needs',
    difficulty: 'medium',
    type: 'single',
    correct: ['C'],
    en: {
      prompt:
        'A solo traveller says, "I have a free afternoon." Which opening question helps most?',
      options: [
        'Which hotel are you staying at?',
        'Would you like a printed brochure?',
        'What kind of experience do you enjoy, and how far are you happy to travel?',
        'Do you want the most popular tour?',
      ],
      feedback:
        'An open question about preferences and limits gives you what you need to recommend something that fits.',
    },
    ar: {
      prompt: 'يقول مسافر منفرد: «لديّ فترة ما بعد الظهر فارغة». أيّ سؤال افتتاحي هو الأكثر فائدة؟',
      options: [
        'في أي فندق تقيم؟',
        'هل تودّ الحصول على نشرة مطبوعة؟',
        'ما نوع التجارب التي تستمتع بها، وإلى أي مسافة تفضّل أن تتنقل؟',
        'هل تريد الجولة الأكثر شعبية؟',
      ],
      feedback: 'السؤال المفتوح عن التفضيلات والحدود يمنحك ما تحتاجه لاقتراح تجربة مناسبة فعلًا.',
    },
  },
  {
    code: 'DN-003',
    competency: 'discover_needs',
    difficulty: 'medium',
    type: 'multiple',
    correct: ['A', 'B', 'D'],
    en: {
      prompt: 'Which details help you match an activity to a visitor? Select all that apply.',
      options: [
        'Group size and ages',
        'Mobility or accessibility needs',
        "The visitor's payment card number",
        'Available time and budget',
      ],
      feedback:
        'Group, access needs, time and budget shape the recommendation. You never need payment card details to suggest an activity.',
    },
    ar: {
      prompt: 'أيّ من التفاصيل التالية تساعدك على مطابقة النشاط مع الزائر؟ اختر كل ما ينطبق.',
      options: [
        'حجم المجموعة وأعمار أفرادها',
        'احتياجات الحركة أو إمكانية الوصول',
        'رقم بطاقة الدفع الخاصة بالزائر',
        'الوقت المتاح والميزانية',
      ],
      feedback:
        'حجم المجموعة واحتياجات الوصول والوقت والميزانية هي ما يوجّه التوصية. ولا تحتاج أبدًا إلى بيانات بطاقة الدفع لاقتراح نشاط.',
    },
  },
  {
    code: 'DN-004',
    competency: 'discover_needs',
    difficulty: 'hard',
    type: 'scenario',
    correct: ['D'],
    en: {
      prompt:
        'Four colleagues have 90 minutes before a flight. One wants shopping, one wants culture and two are undecided. You have two verified options nearby. What is your best next step?',
      options: [
        'Pick shopping because it is the most popular',
        'Suggest they skip the visit to avoid any risk',
        'Offer a third option you have not yet verified',
        'Describe both verified options briefly, mention the time needed to return for the flight, and let the group choose',
      ],
      feedback:
        'Give the group clear, verified choices with the practical constraint that matters most (the flight), then let them decide.',
    },
    ar: {
      prompt:
        'لدى أربعة زملاء 90 دقيقة قبل رحلتهم. أحدهم يريد التسوّق وآخر يريد الثقافة واثنان لم يحسما رأيهما. لديك خياران قريبان تم التحقق منهما. ما أفضل خطوة تالية؟',
      options: [
        'اختيار التسوّق لأنه الأكثر شعبية',
        'اقتراح التخلي عن الزيارة تفاديًا لأي مخاطرة',
        'عرض خيار ثالث لم يتم التحقق منه بعد',
        'وصف الخيارين الموثّقين بإيجاز، وذكر الوقت اللازم للعودة قبل الرحلة، وترك القرار للمجموعة',
      ],
      feedback:
        'قدّم للمجموعة خيارات واضحة موثّقة مع القيد العملي الأهم (موعد الرحلة)، ثم اترك القرار لها.',
    },
  },
  {
    code: 'DN-005',
    competency: 'discover_needs',
    difficulty: 'hard',
    type: 'multiple',
    correct: ['A', 'C', 'D'],
    en: {
      prompt:
        'A visitor asks for a "quiet" activity. Which responses show you are discovering their real need? Select all that apply.',
      options: [
        'Ask what quiet means to them, such as few crowds or low noise',
        'Offer the loudest festival so they can compare',
        'Ask whether they prefer indoor or outdoor settings',
        'Check whether anyone in the party has sensory needs',
      ],
      feedback:
        'Clarify what "quiet" means and the setting that suits the party. Offering a loud event does not explore the need.',
    },
    ar: {
      prompt:
        'يطلب زائر نشاطًا «هادئًا». أيّ من الاستجابات التالية تُظهر أنك تستكشف حاجته الحقيقية؟ اختر كل ما ينطبق.',
      options: [
        'سؤاله عمّا يعنيه الهدوء بالنسبة له، كقلة الازدحام أو انخفاض الضجيج',
        'عرض أكثر المهرجانات صخبًا ليقارن',
        'سؤاله هل يفضّل الأماكن المغلقة أم المفتوحة',
        'التحقق مما إذا كان أحد أفراد المجموعة لديه حساسية حسّية',
      ],
      feedback:
        'وضّح معنى «الهدوء» والأجواء التي تناسب المجموعة. أما عرض فعالية صاخبة فلا يستكشف الحاجة.',
    },
  },

  // --- Verify information -----------------------------------------------------------------
  {
    code: 'VI-001',
    competency: 'verify_information',
    difficulty: 'easy',
    type: 'single',
    correct: ['C'],
    en: {
      prompt: 'A visitor asks whether a museum is open on Friday morning. You are not sure.',
      options: [
        'Say yes, most museums are open',
        'Tell them to try their luck',
        "Check the museum's official listing, then answer",
        'Say it is closed to be safe',
      ],
      feedback:
        'Verify from the official source before you answer. A guess can send the visitor away for nothing.',
    },
    ar: {
      prompt: 'يسأل زائر عمّا إذا كان المتحف مفتوحًا صباح الجمعة، وأنت غير متأكد.',
      options: [
        'القول إنه مفتوح، فمعظم المتاحف كذلك',
        'اقتراح أن يجرّب حظه',
        'مراجعة القائمة الرسمية للمتحف ثم الإجابة',
        'القول إنه مغلق لتجنّب الخطأ',
      ],
      feedback: 'تحقق من المصدر الرسمي قبل أن تجيب. فالتخمين قد يدفع الزائر إلى مشوار بلا جدوى.',
    },
  },
  {
    code: 'VI-002',
    competency: 'verify_information',
    difficulty: 'medium',
    type: 'single',
    correct: ['B'],
    en: {
      prompt: 'Two colleagues give you different closing times for the same venue. What do you do?',
      options: [
        'Use the later time',
        "Confirm with the venue's official channel and note the source",
        'Average the two times',
        'Trust the colleague with more experience',
      ],
      feedback:
        'When sources disagree, go to the official channel and record where the answer came from.',
    },
    ar: {
      prompt: 'يعطيك زميلان موعدين مختلفين لإغلاق المكان نفسه. ماذا تفعل؟',
      options: [
        'اعتماد الموعد الأخير',
        'التأكد من القناة الرسمية للمكان وتوثيق المصدر',
        'احتساب متوسط الموعدين',
        'تصديق الزميل الأكثر خبرة',
      ],
      feedback: 'عند اختلاف المصادر، ارجع إلى القناة الرسمية ودوّن مصدر الإجابة.',
    },
  },
  {
    code: 'VI-003',
    competency: 'verify_information',
    difficulty: 'medium',
    type: 'multiple',
    correct: ['A', 'C'],
    en: {
      prompt: 'Which sources can you rely on to confirm a ticket price? Select all that apply.',
      options: [
        "The operator's official website or price list",
        'A social media post from last season',
        "The ticketing partner's current booking system",
        "A visitor's memory of what they paid before",
      ],
      feedback: 'Use current, official sources. Old posts and recollections can be out of date.',
    },
    ar: {
      prompt: 'ما المصادر التي يمكنك الاعتماد عليها لتأكيد سعر التذكرة؟ اختر كل ما ينطبق.',
      options: [
        'الموقع الرسمي للمشغّل أو قائمة أسعاره',
        'منشور في وسائل التواصل من الموسم الماضي',
        'نظام الحجز الحالي لدى شريك التذاكر',
        'ما يتذكره الزائر عمّا دفعه سابقًا',
      ],
      feedback: 'اعتمد على مصادر رسمية وحديثة. فالمنشورات القديمة والذكريات قد تكون غير محدّثة.',
    },
  },
  {
    code: 'VI-004',
    competency: 'verify_information',
    difficulty: 'hard',
    type: 'scenario',
    correct: ['A'],
    en: {
      prompt:
        "A visitor wants to book a desert tour for tomorrow. The operator's page shows seats, but it was updated three days ago. What do you do?",
      options: [
        'Contact the operator to confirm current availability, and tell the visitor when you will have an answer',
        'Confirm the booking because the page shows seats',
        'Tell the visitor the tour is full',
        'Promise seats and sort it out later',
      ],
      feedback:
        'Do not confirm on stale information. Check with the operator and set an honest expectation for when the visitor will hear back.',
    },
    ar: {
      prompt:
        'يريد زائر حجز جولة صحراوية ليوم الغد. تُظهر صفحة المشغّل وجود مقاعد، لكنها حُدّثت قبل ثلاثة أيام. ماذا تفعل؟',
      options: [
        'التواصل مع المشغّل لتأكيد التوفر الحالي، وإخبار الزائر بموعد حصوله على الجواب',
        'تأكيد الحجز لأن الصفحة تُظهر مقاعد',
        'إخبار الزائر بأن الجولة مكتملة',
        'الوعد بتوفير مقاعد ثم تدبّر الأمر لاحقًا',
      ],
      feedback:
        'لا تؤكد الحجز بناءً على معلومات قديمة. تحقق من المشغّل وحدّد للزائر توقعًا صادقًا لموعد ردّك.',
    },
  },
  {
    code: 'VI-005',
    competency: 'verify_information',
    difficulty: 'hard',
    type: 'multiple',
    correct: ['B', 'C', 'D'],
    en: {
      prompt:
        'You are passing on safety information about a beach activity. Which steps are correct? Select all that apply.',
      options: [
        'Retell it from memory to keep it simple',
        'Use the latest notice from the responsible authority',
        'Check the date of the notice',
        'Tell the visitor where to find the official notice',
      ],
      feedback:
        'Safety information must be current and traceable: use the latest official notice, check its date and point to the source.',
    },
    ar: {
      prompt:
        'ستنقل معلومات السلامة الخاصة بنشاط على الشاطئ. أيّ الخطوات التالية صحيحة؟ اختر كل ما ينطبق.',
      options: [
        'إعادة روايتها من الذاكرة لتبسيطها',
        'الاعتماد على أحدث إشعار صادر عن الجهة المسؤولة',
        'التحقق من تاريخ الإشعار',
        'إرشاد الزائر إلى مكان الإشعار الرسمي',
      ],
      feedback:
        'يجب أن تكون معلومات السلامة حديثة ويمكن تتبّع مصدرها: استخدم أحدث إشعار رسمي، وتحقق من تاريخه، وأرشد الزائر إلى المصدر.',
    },
  },

  // --- Communicate clearly ----------------------------------------------------------------
  {
    code: 'CC-001',
    competency: 'communicate_clearly',
    difficulty: 'easy',
    type: 'single',
    correct: ['D'],
    en: {
      prompt: 'A visitor with limited English looks confused by your directions.',
      options: [
        'Repeat the same sentence louder',
        'Give a longer, more detailed explanation',
        'Hand over a leaflet and step away',
        'Use short, simple words, point to a map and check they understood',
      ],
      feedback:
        'Plain words, a visual aid and a check for understanding work better than volume or length.',
    },
    ar: {
      prompt: 'يبدو على زائر ذي لغة إنجليزية محدودة الارتباك من إرشاداتك.',
      options: [
        'تكرار الجملة نفسها بصوت أعلى',
        'تقديم شرح أطول وأكثر تفصيلًا',
        'تسليمه نشرة والابتعاد',
        'استخدام كلمات قصيرة وبسيطة، والإشارة إلى الخريطة، والتأكد من فهمه',
      ],
      feedback: 'الكلمات البسيطة والوسيلة البصرية والتأكد من الفهم أفضل من رفع الصوت أو الإطالة.',
    },
  },
  {
    code: 'CC-002',
    competency: 'communicate_clearly',
    difficulty: 'medium',
    type: 'single',
    correct: ['A'],
    en: {
      prompt:
        'You are giving directions to a hotel that needs three turns. What is the clearest way?',
      options: [
        'Give one or two steps at a time, mention a landmark and ask the visitor to repeat them back',
        'Give all three turns in one long sentence',
        'Tell them to follow the signs',
        'Say it is easy to find',
      ],
      feedback: 'Short steps, a landmark and a repeat-back make a route easy to remember.',
    },
    ar: {
      prompt: 'تشرح الطريق إلى فندق يتطلب ثلاثة منعطفات. ما الطريقة الأوضح؟',
      options: [
        'إعطاء خطوة أو خطوتين في كل مرة، وذكر معلم بارز، وطلب أن يعيد الزائر ما سمعه',
        'ذكر المنعطفات الثلاثة في جملة واحدة طويلة',
        'الطلب منه اتباع اللافتات',
        'القول إن المكان سهل الوصول إليه',
      ],
      feedback: 'الخطوات القصيرة والمعلم البارز وإعادة الزائر لما سمعه تجعل الطريق سهل التذكّر.',
    },
  },
  {
    code: 'CC-003',
    competency: 'communicate_clearly',
    difficulty: 'medium',
    type: 'multiple',
    correct: ['A', 'C', 'D'],
    en: {
      prompt: 'Which habits make a spoken message easier to follow? Select all that apply.',
      options: [
        'Speak at a steady pace',
        'Use industry jargon to sound professional',
        'Pause and check understanding',
        'Replace acronyms with plain words',
      ],
      feedback:
        'A steady pace, pauses and plain words help. Jargon makes the message harder to follow.',
    },
    ar: {
      prompt: 'أيّ من العادات التالية تجعل الرسالة المنطوقة أسهل في المتابعة؟ اختر كل ما ينطبق.',
      options: [
        'التحدث بوتيرة ثابتة',
        'استخدام مصطلحات القطاع ليبدو الكلام مهنيًا',
        'التوقف للتأكد من الفهم',
        'استبدال الاختصارات بكلمات واضحة',
      ],
      feedback:
        'الوتيرة الثابتة والتوقف والكلمات الواضحة تساعد، أما المصطلحات المتخصصة فتجعل الرسالة أصعب.',
    },
  },
  {
    code: 'CC-004',
    competency: 'communicate_clearly',
    difficulty: 'hard',
    type: 'scenario',
    correct: ['C'],
    en: {
      prompt:
        'A visitor is upset and speaks quickly about a missed transfer. What should you do first?',
      options: [
        'Interrupt with the transfer policy',
        'Tell them to calm down',
        'Listen without interrupting, then summarise the problem in your own words to confirm it',
        'Explain whose fault it was',
      ],
      feedback:
        'Listening fully and summarising shows you understood, and it lets the visitor correct you before you act.',
    },
    ar: {
      prompt: 'زائر منزعج يتحدث بسرعة عن تفويته رحلة النقل. ما الذي يجب أن تفعله أولًا؟',
      options: [
        'مقاطعته بشرح سياسة النقل',
        'الطلب منه أن يهدأ',
        'الإصغاء إليه دون مقاطعة، ثم تلخيص المشكلة بكلماتك للتأكد من فهمها',
        'توضيح من المتسبب في الخطأ',
      ],
      feedback: 'الإصغاء الكامل والتلخيص يُظهران أنك فهمت، ويتيحان للزائر تصحيح فهمك قبل أن تتصرف.',
    },
  },
  {
    code: 'CC-005',
    competency: 'communicate_clearly',
    difficulty: 'hard',
    type: 'multiple',
    correct: ['A', 'B', 'D'],
    en: {
      prompt:
        'You are writing a short message to confirm a visitor pickup. Which elements should it include? Select all that apply.',
      options: [
        'The exact time and place',
        'A contact number for the day',
        'Internal booking codes only staff understand',
        'What the visitor should bring or do',
      ],
      feedback:
        'A confirmation should carry what the visitor needs: when, where, who to call and what to prepare.',
    },
    ar: {
      prompt:
        'تكتب رسالة قصيرة لتأكيد موعد استقبال زائر. أيّ العناصر التالية يجب أن تتضمنها؟ اختر كل ما ينطبق.',
      options: [
        'الوقت والمكان بدقة',
        'رقم للتواصل في يوم الاستقبال',
        'رموز حجز داخلية لا يفهمها إلا الموظفون',
        'ما ينبغي أن يحضره الزائر أو يفعله',
      ],
      feedback: 'يجب أن يحمل التأكيد ما يحتاجه الزائر: الوقت والمكان ورقم التواصل وما عليه تجهيزه.',
    },
  },

  // --- Recover service --------------------------------------------------------------------
  {
    code: 'RS-001',
    competency: 'recover_service',
    difficulty: 'easy',
    type: 'single',
    correct: ['B'],
    en: {
      prompt: 'A tour is delayed by 45 minutes and a visitor complains.',
      options: [
        'Say delays are not your department',
        'Apologise, explain what you know and offer options you can deliver',
        'Offer a free upgrade you are not authorised to give',
        'Suggest they should have booked earlier',
      ],
      feedback:
        'Acknowledge the impact, be honest about what you know and offer only options you can deliver.',
    },
    ar: {
      prompt: 'تأخرت جولة سياحية 45 دقيقة ويشتكي أحد الزوّار.',
      options: [
        'القول إن التأخير ليس من اختصاصك',
        'الاعتذار، وشرح ما تعرفه، وتقديم خيارات تستطيع تنفيذها',
        'عرض ترقية مجانية لا تملك صلاحية منحها',
        'اقتراح أنه كان عليه الحجز مبكرًا',
      ],
      feedback: 'أقرّ بتأثير التأخير، وكن صادقًا في ما تعرفه، ولا تعرض إلا خيارات تستطيع تنفيذها.',
    },
  },
  {
    code: 'RS-002',
    competency: 'recover_service',
    difficulty: 'medium',
    type: 'single',
    correct: ['D'],
    en: {
      prompt: "A visitor's booking was not recorded, but they hold a confirmation email.",
      options: [
        'Ask them to come back with proof later',
        'Tell them the system is always wrong',
        'Refuse to help until a manager arrives',
        'Accept the confirmation, check the record and fix the booking or find an alternative',
      ],
      feedback:
        'Take ownership: use the evidence the visitor has, check the record and resolve it.',
    },
    ar: {
      prompt: 'لم يُسجَّل حجز أحد الزوّار في النظام، لكنه يحمل رسالة تأكيد بالبريد الإلكتروني.',
      options: [
        'الطلب منه العودة لاحقًا بإثبات',
        'إخباره بأن النظام دائمًا مخطئ',
        'رفض المساعدة حتى وصول المدير',
        'قبول رسالة التأكيد، ومراجعة السجل، وتصحيح الحجز أو إيجاد بديل',
      ],
      feedback: 'تحمّل المسؤولية: اعتمد على الدليل الذي لدى الزائر، وراجع السجل، وعالج المشكلة.',
    },
  },
  {
    code: 'RS-003',
    competency: 'recover_service',
    difficulty: 'medium',
    type: 'multiple',
    correct: ['A', 'B', 'D'],
    en: {
      prompt: 'Which steps belong in a good service recovery? Select all that apply.',
      options: [
        'Acknowledge the problem',
        'Offer a remedy within your authority',
        "Point out that the visitor's plans were unrealistic",
        'Follow up to check the visitor is satisfied',
      ],
      feedback:
        'Acknowledge, remedy within your authority and follow up. Blaming the visitor never recovers service.',
    },
    ar: {
      prompt: 'أيّ من الخطوات التالية تدخل ضمن استعادة جيدة للخدمة؟ اختر كل ما ينطبق.',
      options: [
        'الإقرار بوجود المشكلة',
        'تقديم حل ضمن صلاحياتك',
        'التنبيه إلى أن خطط الزائر كانت غير واقعية',
        'المتابعة للتأكد من رضا الزائر',
      ],
      feedback:
        'أقرّ بالمشكلة، وقدّم حلًا ضمن صلاحياتك، ثم تابع. أما لوم الزائر فلا يعيد الخدمة إلى مسارها.',
    },
  },
  {
    code: 'RS-004',
    competency: 'recover_service',
    difficulty: 'hard',
    type: 'scenario',
    correct: ['C'],
    en: {
      prompt:
        "A family's activity is cancelled because of weather. Two alternatives are available and one costs more. What do you do?",
      options: [
        'Offer only the cheaper one without explaining',
        'Promise to cover any extra cost without checking',
        'Acknowledge the disappointment, explain both alternatives including cost, and let the family choose',
        'Suggest they come back another day',
      ],
      feedback:
        'Acknowledge the impact, be transparent about the choices and cost, and let the family decide.',
    },
    ar: {
      prompt: 'أُلغي نشاط عائلة بسبب الطقس. يتوفر بديلان أحدهما أعلى تكلفة. ماذا تفعل؟',
      options: [
        'عرض الأرخص فقط دون توضيح',
        'الوعد بتحمّل أي تكلفة إضافية دون التحقق',
        'الإقرار بخيبة أملهم، وشرح البديلين بما في ذلك التكلفة، وترك الاختيار للعائلة',
        'اقتراح العودة في يوم آخر',
      ],
      feedback: 'أقرّ بتأثير الإلغاء، وكن شفافًا في الخيارات والتكلفة، واترك القرار للعائلة.',
    },
  },
  {
    code: 'RS-005',
    competency: 'recover_service',
    difficulty: 'hard',
    type: 'multiple',
    correct: ['A', 'C', 'D'],
    en: {
      prompt:
        'A visitor wants a refund you cannot approve. Which responses are appropriate? Select all that apply.',
      options: [
        'Explain what you can do and who can decide',
        'Promise the refund so they leave happy',
        'Escalate with clear notes so the visitor does not repeat the story',
        'Give a reply time you can keep',
      ],
      feedback: 'Be clear about limits, hand over with notes and promise only what you can keep.',
    },
    ar: {
      prompt:
        'يطلب زائر استرداد مبلغ لا تملك صلاحية الموافقة عليه. أيّ الاستجابات التالية مناسبة؟ اختر كل ما ينطبق.',
      options: [
        'توضيح ما تستطيع فعله ومن يملك القرار',
        'الوعد بالاسترداد ليغادر راضيًا',
        'التصعيد مع ملاحظات واضحة حتى لا يضطر الزائر إلى إعادة روايته',
        'تحديد موعد للرد يمكنك الالتزام به',
      ],
      feedback:
        'كن واضحًا بشأن حدود صلاحيتك، وسلّم الحالة بملاحظات وافية، ولا تَعِد إلا بما تستطيع الوفاء به.',
    },
  },

  // --- Protect information ----------------------------------------------------------------
  {
    code: 'PI-001',
    competency: 'protect_information',
    difficulty: 'easy',
    type: 'single',
    correct: ['C'],
    en: {
      prompt: 'A caller asks which room another guest is staying in.',
      options: [
        "Tell them, since they know the guest's name",
        'Read out the booking details',
        'Offer to pass on a message through the approved route',
        'Ask them to guess the room number',
      ],
      feedback: 'Do not disclose guest details. Offer an approved way to reach the guest instead.',
    },
    ar: {
      prompt: 'يسأل متصل عن رقم الغرفة التي يقيم فيها نزيل آخر.',
      options: [
        'إخباره، فهو يعرف اسم النزيل',
        'قراءة تفاصيل الحجز له',
        'عرض إيصال رسالة عبر القناة المعتمدة',
        'الطلب منه أن يخمّن رقم الغرفة',
      ],
      feedback: 'لا تكشف تفاصيل النزلاء. اعرض بدلًا من ذلك طريقة معتمدة للوصول إليهم.',
    },
  },
  {
    code: 'PI-002',
    competency: 'protect_information',
    difficulty: 'medium',
    type: 'single',
    correct: ['A'],
    en: {
      prompt:
        "You must share a learner's details with a venue to complete a booking. What is correct?",
      options: [
        'Share only what the booking needs, through the approved channel',
        'Send everything you hold on the learner',
        'Post the details in a group chat so the team can see',
        "Give the venue the learner's personal mobile number",
      ],
      feedback: 'Share the minimum needed, with the right people, through approved channels.',
    },
    ar: {
      prompt: 'عليك مشاركة بيانات متعلّم مع مكان لإتمام حجز. ما التصرف الصحيح؟',
      options: [
        'مشاركة ما يتطلبه الحجز فقط عبر القناة المعتمدة',
        'إرسال كل ما لديك عن المتعلّم',
        'نشر البيانات في مجموعة محادثة ليراها الفريق',
        'إعطاء المكان رقم الجوال الشخصي للمتعلّم',
      ],
      feedback: 'شارك الحد الأدنى اللازم فقط، مع الجهة المناسبة، وعبر القنوات المعتمدة.',
    },
  },
  {
    code: 'PI-003',
    competency: 'protect_information',
    difficulty: 'medium',
    type: 'multiple',
    correct: ['A', 'C', 'D'],
    en: {
      prompt: 'Which are good practice with visitor personal data? Select all that apply.',
      options: [
        'Lock your screen when you step away',
        'Leave printed visitor lists on the desk',
        'Share data only with people who need it',
        'Report a suspected breach straight away',
      ],
      feedback:
        'Lock screens, share on a need-to-know basis and report problems at once. Do not leave printed lists out.',
    },
    ar: {
      prompt:
        'أيّ مما يلي يُعدّ ممارسة جيدة عند التعامل مع البيانات الشخصية للزوّار؟ اختر كل ما ينطبق.',
      options: [
        'قفل الشاشة عند مغادرة مكانك',
        'ترك قوائم الزوّار المطبوعة على المكتب',
        'مشاركة البيانات مع من يحتاجها فقط',
        'الإبلاغ فورًا عن أي اشتباه في تسرّب',
      ],
      feedback:
        'اقفل الشاشة، وشارك البيانات على أساس الحاجة إلى المعرفة، وبلّغ فورًا عن أي مشكلة. ولا تترك القوائم المطبوعة مكشوفة.',
    },
  },
  {
    code: 'PI-004',
    competency: 'protect_information',
    difficulty: 'hard',
    type: 'scenario',
    correct: ['B'],
    en: {
      prompt:
        'A colleague asks you to email a spreadsheet of visitor names and phone numbers to their personal address so they can work from home. What do you do?',
      options: [
        'Send it, since they are a colleague',
        'Decline, explain the data policy and point them to the approved secure way to work remotely',
        'Send it with the password in the same email',
        'Send only half of the list',
      ],
      feedback:
        'Visitor data must stay in approved systems. Decline politely and direct your colleague to the secure option.',
    },
    ar: {
      prompt:
        'يطلب منك زميل إرسال جدول يضم أسماء الزوّار وأرقام هواتفهم إلى بريده الشخصي ليعمل من المنزل. ماذا تفعل؟',
      options: [
        'إرساله، فهو زميل',
        'الاعتذار، وشرح سياسة البيانات، وإرشاده إلى الطريقة الآمنة المعتمدة للعمل عن بُعد',
        'إرساله مع كلمة المرور في الرسالة نفسها',
        'إرسال نصف القائمة فقط',
      ],
      feedback:
        'يجب أن تبقى بيانات الزوّار داخل الأنظمة المعتمدة. اعتذر بلطف وأرشد زميلك إلى الخيار الآمن.',
    },
  },
]
