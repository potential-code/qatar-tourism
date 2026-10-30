/**
 * Arabic variants of learner-visible seed copy (29 Oct update). Keyed by the exact English text,
 * so English values, ids and counts stay untouched and a row from the database can be shown in
 * Arabic with `localised()` (client/src/i18n/localised.ts). Modern Standard Arabic, hospitality
 * register. Demonstration material: final Arabic review is a handover item for Qatar Tourism.
 */
export const AR_CURRICULUM: Readonly<Record<string, string>> = {
  // Content Library courses C08 and C09 (29 Oct)
  'Welcoming visitors to Qatar': 'الترحيب بزوار قطر',
  'SCORM 2004 package (English and Arabic)': 'حزمة SCORM 2004 (بالإنجليزية والعربية)',
  'Five short screens: welcome, visitor needs, a captioned sample video, a service interaction and a knowledge check. Available in English and Arabic.':
    'خمس شاشات قصيرة: الترحيب، واحتياجات الزائر، وفيديو نموذجي مع ترجمة نصية، وتفاعل خدمة، واختبار معرفي. متاحة بالإنجليزية والعربية.',
  'Visit every screen and pass the three-question knowledge check (2 of 3). Credit counts once in either language.':
    'تصفّح كل الشاشات واجتز الاختبار المعرفي المكوّن من ثلاثة أسئلة (2 من 3). يُحتسب الإنجاز مرة واحدة بأي من اللغتين.',
  'Planning a visitor experience': 'التخطيط لتجربة الزائر',
  'xAPI activity (English and Arabic)': 'نشاط xAPI (بالإنجليزية والعربية)',
  'Choose a destination for a visitor, respond to a changed plan and complete the activity. Statements go to a simulated learning record store. Available in English and Arabic.':
    'اختر وجهة لزائر، وتعامل مع تغيّر في الخطة، ثم أكمل النشاط. تُرسل البيانات إلى مخزن سجلات تعلّم تجريبي. متاح بالإنجليزية والعربية.',
  'Finish the activity; the package sends a completed statement. Credit counts once in either language.':
    'أكمل النشاط لترسل الحزمة بيان الإكمال. يُحتسب الإنجاز مرة واحدة بأي من اللغتين.',
  'English and Arabic': 'بالإنجليزية والعربية',
  // Courses C01 to C07
  'Welcoming every visitor': 'الترحيب بكل زائر',
  'Greet, ask a useful question, listen and offer a clear next step.':
    'رحّب بالزائر، واطرح سؤالًا مفيدًا، وأنصت جيدًا، ثم اقترح خطوة تالية واضحة.',
  'Understanding visitor needs': 'فهم احتياجات الزائر',
  'Branching scenario with a family choosing an activity.': 'سيناريو متفرّع لعائلة تختار نشاطًا.',
  'Clear and inclusive communication': 'تواصل واضح وشامل',
  'Plain language, accessibility preferences and checking understanding.':
    'لغة مبسّطة، ومراعاة احتياجات الوصول، والتأكد من الفهم.',
  'Recovering a difficult service moment': 'تدارك موقف خدمة صعب',
  'A disappointed visitor faces a changed booking. Practise acknowledgement, options and escalation.':
    'زائر منزعج بسبب تغيّر حجزه. تدرّب على الإقرار بالموقف وتقديم الخيارات والتصعيد.',
  'Planning a helpful visitor response': 'التخطيط لاستجابة مفيدة للزائر',
  'One-page checklist with a short written response.':
    'قائمة مراجعة من صفحة واحدة مع ردّ كتابي قصير.',
  'Delivering service in practice': 'تقديم الخدمة عمليًا',
  'Role-play in pairs, feedback, attendance and scored demonstration.':
    'لعب أدوار ثنائي، وملاحظات، وحضور، وتطبيق عملي مُقيَّم.',
  'Telling a concise destination story': 'سرد قصة موجزة عن الوجهة',
  'Program C sample overview with a fictional story-planning worksheet.':
    'نظرة عامة على نموذج البرنامج C مع ورقة عمل افتراضية لتخطيط القصة.',
  Video: 'فيديو',
  'Interactive package': 'حزمة تفاعلية',
  'Resource and exercise': 'مورد وتمرين',
  'Trainer session': 'جلسة مع المدرّب',
  Preview: 'معاينة',
  'Captioned video plus transcript; complete at 90 percent watched.':
    'فيديو مع ترجمة نصية ونص مكتوب؛ يكتمل عند مشاهدة 90 بالمئة.',
  'Three choices, feedback and retry; package reports completion and score.':
    'ثلاثة خيارات مع ملاحظات وإعادة المحاولة؛ تُبلِّغ الحزمة عن الإكمال والدرجة.',
  'Add three formative questions.': 'ثلاثة أسئلة تكوينية.',
  'Minimum 80 percent on module quiz.': 'الحد الأدنى 80 بالمئة في اختبار الوحدة.',
  'B uses a 100–150 word task; A develops it into the practical assignment.':
    'يستخدم البرنامج B مهمة من 100 إلى 150 كلمة، ويطوّرها البرنامج A إلى المهمة العملية.',
  'Role-play in pairs, feedback, attendance and scored demonstration. A only.':
    'لعب أدوار ثنائي، وملاحظات، وحضور، وتطبيق عملي مُقيَّم. للبرنامج A فقط.',
  'No claim of a fully built third programme.': 'لا يُقصد به برنامج ثالث مكتمل البناء.',
  // Package labels
  'Captioned video with transcript': 'فيديو مترجم نصيًا مع النص المكتوب',
  'SCORM 2004 sample package': 'حزمة نموذجية بمعيار SCORM 2004',
  'SCORM 1.2 sample package': 'حزمة نموذجية بمعيار SCORM 1.2',
  'Branching HTML preview (not a verified SCORM package)':
    'معاينة HTML متفرّعة (ليست حزمة SCORM موثّقة)',
  // Programmes
  'Tourism Service Professional': 'محترف خدمة السياحة',
  'Service professionals who want a structured, certified route.':
    'محترفو الخدمة الراغبون في مسار منظّم ومعتمد.',
  'Build service skills through self-paced learning, guided practice and trainer-led sessions. Complete assessments and a practical assignment to earn a demonstration certificate.':
    'نمِّ مهارات الخدمة عبر التعلّم الذاتي والتدريب الموجَّه وجلسات المدرّب. أكمل التقييمات والمهمة العملية لتحصل على شهادة تجريبية.',
  'Two levels • Hybrid • Approximately 4 hours • Certification track':
    'مستويان • مدمج • نحو 4 ساعات • مسار الشهادة',
  'Approximately 4 hours': 'نحو 4 ساعات',
  Hybrid: 'مدمج',
  'Join Program A': 'انضم إلى البرنامج A',
  'Visitor Service Essentials': 'أساسيات خدمة الزوّار',
  'Anyone who serves visitors and wants a personalised starting point.':
    'كل من يخدم الزوّار ويرغب في نقطة انطلاق مخصّصة له.',
  'Develop everyday visitor-service skills through a personalised selection of short lessons and realistic practice. Measure your improvement from start to finish.':
    'طوّر مهارات خدمة الزوّار اليومية عبر مجموعة مخصّصة من الدروس القصيرة والتدريب الواقعي. وقِس تقدّمك من البداية إلى النهاية.',
  'One stage • Self-paced • Approximately 60–90 minutes • No certificate':
    'مرحلة واحدة • تعلّم ذاتي • نحو 60 إلى 90 دقيقة • بلا شهادة',
  'Approximately 60–90 minutes': 'نحو 60 إلى 90 دقيقة',
  'Self-paced': 'تعلّم ذاتي',
  'Start with Program B': 'ابدأ بالبرنامج B',
  'Destination Storytelling': 'سرد قصص الوجهات',
  'Illustrative sample of a possible future Academy offering.':
    'نموذج توضيحي لبرنامج محتمل تقدّمه الأكاديمية مستقبلًا.',
  'Explore a sample future Academy offering focused on clear, engaging destination stories.':
    'استكشف نموذجًا لبرنامج مستقبلي محتمل للأكاديمية يركّز على سرد قصص واضحة وجذّابة عن الوجهات.',
  'Additional sample programme • Overview and reporting preview':
    'برنامج نموذجي إضافي • نظرة عامة ومعاينة التقارير',
  'Overview and reporting preview': 'نظرة عامة ومعاينة التقارير',
  'Sample overview': 'نظرة عامة نموذجية',
  'Explore sample programme': 'استكشف البرنامج النموذجي',
  // Paths
  'B Hotel guest services': 'ب: خدمات ضيوف الفنادق',
  'C01, C02, C03 and C05 with a complaint role-play, then the post-assessment.':
    'الدروس C01 وC02 وC03 وC05 مع لعب أدوار لشكوى، ثم التقييم البعدي.',
  'B Transport services': 'ب: خدمات النقل',
  'C01, C03, C02 with a transport context and C05, with a directions role-play, then the post-assessment.':
    'الدروس C01 وC03 وC02 (بسياق النقل) وC05 مع لعب أدوار للإرشاد إلى الاتجاهات، ثم التقييم البعدي.',
  'B General visitor service': 'ب: خدمة الزوّار العامة',
  'General C01–C03 and C05 with a practice scenario of the learner’s choice, then the post-assessment.':
    'الدروس C01 إلى C03 وC05 مع سيناريو تدريبي يختاره المتعلّم، ثم التقييم البعدي.',
  'A Professional pathway': 'أ: المسار المهني',
  'Foundation units, practice, trainer session, assignment and post-assessment (C01–C06 plus all A assessments and the practical assignment).':
    'وحدات تأسيسية وتدريب وجلسة مع المدرّب ومهمة وتقييم بعدي (الدروس C01 إلى C06 وجميع تقييمات البرنامج A والمهمة العملية).',
  'C Destination storytelling preview': 'ج: معاينة سرد قصص الوجهات',
  'Illustrative sample: the C07 preview and story-planning worksheet.':
    'نموذج توضيحي: معاينة C07 وورقة عمل تخطيط القصة.',
  // Path items, stages, notes
  'Pre-assessment (baseline)': 'التقييم القبلي (خط الأساس)',
  'Post-assessment': 'التقييم البعدي',
  'Final assessment': 'التقييم النهائي',
  'Foundation quiz': 'اختبار التأسيس',
  'Practical assignment': 'المهمة العملية',
  'AI complaint scenario: Changed booking': 'سيناريو شكوى بالذكاء الاصطناعي: تغيّر الحجز',
  'AI directions scenario: Unclear directions':
    'سيناريو اتجاهات بالذكاء الاصطناعي: اتجاهات غير واضحة',
  'AI practice: chosen scenario': 'تدريب بالذكاء الاصطناعي: السيناريو المختار',
  'AI practice: text or voice': 'تدريب بالذكاء الاصطناعي: نص أو صوت',
  Onboarding: 'التهيئة',
  'Foundation learning': 'التعلّم التأسيسي',
  'AI practice': 'التدريب بالذكاء الاصطناعي',
  'Trainer-led application': 'التطبيق مع المدرّب',
  'Transport scenario': 'سيناريو النقل',
  // Assessments and assignments
  'Baseline assessment': 'التقييم الأساسي',
  'Visitor service response plan': 'خطة الاستجابة لخدمة الزائر',
  'Short visitor response': 'ردّ قصير على زائر',
  'Prepare a 300–500 word response plan for a visitor whose booked experience has changed. Include discovery questions, two feasible options, an escalation path and a follow-up message. Alternatively upload a two-minute fictional role-play.':
    'أعدّ خطة استجابة من 300 إلى 500 كلمة لزائر تغيّرت تجربته المحجوزة. ضمّنها أسئلة استكشافية وخيارين ممكنين ومسار تصعيد ورسالة متابعة. ويمكنك بدلًا من ذلك رفع لعب أدوار افتراضي مدته دقيقتان.',
  'Write a 100–150 word response to a fictional visitor whose plans have changed. Acknowledge the change, ask one useful question and offer a clear next step.':
    'اكتب ردًّا من 100 إلى 150 كلمة لزائر افتراضي تغيّرت خططه. أقرّ بالتغيير، واطرح سؤالًا مفيدًا واحدًا، وقدّم خطوة تالية واضحة.',
  // C01 video script and scenes
  'A helpful welcome begins with attention. Greet the visitor, introduce yourself and ask what they need today. Listen before suggesting an option. If the request is unclear, ask one short follow-up question. Offer information you can verify and explain the next step in plain language. Before the conversation ends, check that the visitor knows what to do next. A confident service experience is built through clarity, respect and follow-through.':
    'يبدأ الترحيب المفيد بالانتباه. رحّب بالزائر، وعرِّف بنفسك، واسأله عمّا يحتاجه اليوم. أنصت قبل أن تقترح أي خيار. وإذا لم يكن الطلب واضحًا فاطرح سؤال متابعة قصيرًا. قدِّم معلومات يمكنك التحقق منها، واشرح الخطوة التالية بلغة بسيطة. وقبل أن ينتهي الحديث، تأكّد من أن الزائر يعرف ما عليه فعله. وتُبنى تجربة الخدمة الواثقة على الوضوح والاحترام والمتابعة.',
  'A staff member greets the visitor and introduces themselves.':
    'يرحّب أحد الموظفين بالزائر ويعرّف بنفسه.',
  'The visitor asks what is available today.': 'يسأل الزائر عمّا هو متاح اليوم.',
  'The staff member listens, then offers two useful, verified options.':
    'ينصت الموظف ثم يقدّم خيارين مفيدين وموثوقين.',
  'A clear closing: the visitor knows what to do next.':
    'خاتمة واضحة: الزائر يعرف ما عليه فعله بعد ذلك.',
  // Competencies (shared/content/assessments.ts)
  'Discover needs': 'استكشاف الاحتياجات',
  'Verify information': 'التحقق من المعلومات',
  'Communicate clearly': 'التواصل بوضوح',
  'Recover service': 'تدارك الخدمة',
  'Protect information': 'حماية المعلومات',
  // Stage and action labels generated by the progress rules and journey read model
  Certification: 'الشهادة',
  'Level 1: Foundation learning': 'المستوى 1: التعلّم التأسيسي',
  'Level 1: AI practice': 'المستوى 1: التدريب بالذكاء الاصطناعي',
  'Level 2: Trainer-led application': 'المستوى 2: التطبيق مع المدرّب',
  'Level 2: Practical assignment': 'المستوى 2: المهمة العملية',
  'Start pre-assessment': 'ابدأ التقييم القبلي',
  'Take the final assessment': 'أجرِ التقييم النهائي',
  'Take the post-assessment': 'أجرِ التقييم البعدي',
  'Take the foundation quiz': 'أجرِ اختبار التأسيس',
  'Book a trainer-led session': 'احجز جلسة مع المدرّب',
  'Submit your practical assignment': 'سلّم مهمتك العملية',
  'Submit your short visitor response': 'سلّم ردّك القصير على الزائر',
  'Practise responding to a disappointed visitor': 'تدرّب على التعامل مع زائر منزعج',
  'Practise giving clear directions to a worried visitor': 'تدرّب على إرشاد زائر قلق بوضوح',
  'Practise responding to an accessibility request':
    'تدرّب على التعامل مع طلب يتعلق بإمكانية الوصول',
  'Practise handling a group that is running late': 'تدرّب على التعامل مع مجموعة متأخرة',
  'Review your lowest areas': 'راجع المجالات الأضعف لديك',
  'Keep your momentum': 'حافظ على زخمك',
  // --- Profile, AI path and rule copy (learner lane A2) ---
  'Independent professional': 'محترف مستقل',
  'Not currently employed': 'غير موظّف حاليًا',
  'Organisation type = hotel AND job function = guest services/front office':
    'نوع الجهة = فندق، ومجال الوظيفة = خدمة الضيوف أو المكتب الأمامي',
  'Organisation type = transport OR function = driver/transport':
    'نوع الجهة = نقل، أو مجال الوظيفة = سائق أو نقل',
  'Default when no more specific rule matches': 'الافتراضي عند عدم انطباق قاعدة أكثر تحديدًا',
  'Explicit A enrolment; relevant professional goal': 'تسجيل صريح في البرنامج A؛ هدف مهني ذو صلة',
  'Default for the illustrative Program C sample': 'الافتراضي للنموذج التوضيحي للبرنامج C',
  // --- Learning and progress screens (gates, lock reasons, unit activities) ---
  'Programme enrolment, profile and five-question baseline.':
    'التسجيل في البرنامج والملف الشخصي وتقييم أساسي من خمسة أسئلة.',
  'Foundation learning and AI practice. Required units complete and foundation quiz at least 80 percent.':
    'التعلّم التأسيسي والتدريب بالذكاء الاصطناعي. إكمال الوحدات المطلوبة وتحقيق 80 بالمئة على الأقل في اختبار التأسيس.',
  'Trainer-led application and practical assignment. Attendance with a session score of at least 70 and an assignment of at least 70.':
    'التطبيق مع المدرّب والمهمة العملية. الحضور مع درجة جلسة لا تقل عن 70 ودرجة مهمة لا تقل عن 70.',
  'Parallel post-assessment with competency comparison. At least 80 percent.':
    'تقييم بعدي موازٍ مع مقارنة الكفايات. 80 بالمئة على الأقل.',
  'The system checks every required condition before issuing the demo certificate.':
    'يتحقق النظام من كل شرط مطلوب قبل إصدار الشهادة التجريبية.',
  'Complete the baseline assessment first. It is not an entry barrier.':
    'أكمل التقييم الأساسي أولًا. وهو ليس شرطًا للقبول.',
  'Opens after your core lessons and one practice conversation.':
    'يُفتح بعد إكمال دروسك الأساسية ومحادثة تدريبية واحدة.',
  'Complete the four foundation units to open the quiz.':
    'أكمل الوحدات التأسيسية الأربع لفتح الاختبار.',
  'Level 2 opens when the foundation units are complete and the foundation quiz is at least 80 percent.':
    'يُفتح المستوى 2 عند إكمال الوحدات التأسيسية وتحقيق 80 بالمئة على الأقل في اختبار التأسيس.',
  'The final assessment opens after an attended, scored session and an approved assignment.':
    'يُفتح التقييم النهائي بعد حضور جلسة مُقيَّمة واعتماد المهمة.',
  'Branching HTML preview. Not a verified SCORM package.':
    'معاينة HTML متفرّعة. ليست حزمة SCORM موثّقة.',
  'A family of four is choosing an activity at the visitor desk.':
    'عائلة من أربعة أفراد تختار نشاطًا عند مكتب الزوّار.',
  'Our planned activity is unavailable and we only have two hours.':
    'النشاط الذي خططنا له غير متاح، ولدينا ساعتان فقط.',
  'Promise the original activity anyway': 'أعِد بالنشاط الأصلي رغم ذلك',
  'Ask about interests and accessibility needs, then offer two verified alternatives':
    'اسأل عن الاهتمامات واحتياجات الوصول، ثم اقترح بديلين مؤكَّدين',
  'Tell them to search online': 'اطلب منهم البحث عبر الإنترنت',
  'You clarified the need and offered realistic choices.': 'وضّحتَ الحاجة وقدّمتَ خيارات واقعية.',
  'Promising something you cannot confirm risks a second disappointment. Try again.':
    'الوعد بما لا يمكنك تأكيده قد يسبب خيبة أمل ثانية. حاول مرة أخرى.',
  'Sending the visitor away leaves their need unmet. Try again.':
    'صرف الزائر يترك حاجته دون تلبية. حاول مرة أخرى.',
  'Continue to choosing an option and confirming the next step.':
    'تابع إلى اختيار أحد الخيارات وتأكيد الخطوة التالية.',
  'A guided museum visit': 'جولة إرشادية في المتحف',
  'A 75-minute family tour with step-free access, starting in 20 minutes. Availability confirmed with the venue desk.':
    'جولة عائلية مدتها 75 دقيقة بوصول بلا درج، تبدأ بعد 20 دقيقة. تم تأكيد التوفر مع مكتب الموقع.',
  'A short dhow cruise': 'رحلة قصيرة بالقارب الشراعي',
  'A 60-minute bay cruise with seats held until 15:00. Boarding ramp available. Availability confirmed with the operator.':
    'رحلة بحرية في الخليج مدتها 60 دقيقة، والمقاعد محجوزة حتى الساعة 15:00. يتوفر منحدر للصعود. تم تأكيد التوفر مع المشغّل.',
  'Confirm the booking, give the meeting point and time, and check they know what to do next':
    'أكّد الحجز، وأعطِهم نقطة اللقاء والموعد، وتأكّد من أنهم يعرفون ما عليهم فعله بعد ذلك',
  'Clear next step. The family knows where to go, when, and who to ask.':
    'خطوة تالية واضحة. تعرف العائلة إلى أين تذهب ومتى ومن تسأل.',
  'Hand over a leaflet and wish them a good day': 'سلّمهم نشرة وتمنَّ لهم يومًا سعيدًا',
  'The family still has to work out the next step alone. Try confirming it with them.':
    'ما زال على العائلة أن تكتشف الخطوة التالية بمفردها. جرّب تأكيدها معهم.',
  'A visitor looks unsure after your directions. What is the best way to check understanding?':
    'يبدو الزائر غير متأكد بعد إرشاداتك. ما أفضل طريقة للتحقق من فهمه؟',
  'Ask "Is that clear?" and move on': 'اسأل «هل هذا واضح؟» ثم انتقل إلى غيره',
  'Invite them to repeat the key step back to you': 'اطلب منهم إعادة الخطوة الأساسية على مسامعك',
  'Repeat the directions faster': 'كرّر الإرشادات بسرعة أكبر',
  'Inviting a short repeat-back confirms the key step without putting the visitor on the spot.':
    'طلب إعادة قصيرة يؤكد الخطوة الأساسية دون إحراج الزائر.',
  'A yes or no question often hides confusion. Try a way that shows what they understood.':
    'سؤال بنعم أو لا كثيرًا ما يخفي الارتباك. جرّب طريقة تُظهر ما فهموه.',
  'Which sentence uses plain language?': 'أي جملة تستخدم لغة مبسّطة؟',
  'Proceed to the designated rendezvous point adjacent to Gate 3.':
    'توجّهوا إلى نقطة التجمّع المخصصة المجاورة للبوابة 3.',
  'Please meet your guide next to Gate 3, by the blue sign.':
    'تفضّلوا بلقاء مرشدكم قرب البوابة 3، عند اللافتة الزرقاء.',
  'Head to the RV at G3 per the itinerary.': 'اتجهوا إلى نقطة RV عند G3 حسب الجدول.',
  'Short, familiar words and a visible landmark make the step easy to follow.':
    'الكلمات القصيرة المألوفة والمَعلم الظاهر تجعل الخطوة سهلة المتابعة.',
  'Jargon and abbreviations slow visitors down. Look for everyday words and a landmark.':
    'المصطلحات والاختصارات تُبطئ الزوّار. ابحث عن كلمات يومية ومَعلم واضح.',
  'How do you ask about accessibility preferences respectfully?':
    'كيف تسأل عن احتياجات الوصول باحترام؟',
  'Ask whether anything would make the visit more comfortable, and offer options':
    'اسأل عمّا قد يجعل الزيارة أكثر راحة، وقدّم خيارات',
  'Assume what the visitor needs from how they look': 'افترض ما يحتاجه الزائر من مظهره',
  'Avoid the topic so nobody feels uncomfortable': 'تجنّب الموضوع حتى لا يشعر أحد بالحرج',
  'An open, respectful question lets the visitor share only what they choose to.':
    'السؤال المفتوح المحترم يتيح للزائر مشاركة ما يختاره فقط.',
  'Assumptions and silence both create barriers. Ask openly and offer choices.':
    'الافتراضات والصمت كلاهما يصنع حواجز. اسأل بانفتاح وقدّم خيارات.',
  'Clear communication helps every visitor feel welcome. Use plain language and short sentences. Avoid jargon and local abbreviations. Ask about any accessibility preferences respectfully, and offer options such as written directions or a quieter meeting point. Speak at a steady pace and face the visitor. Check understanding by inviting them to repeat the key step, not only by asking whether they understood. Inclusive communication removes barriers so every visitor can take part.':
    'يساعد التواصل الواضح كل زائر على الشعور بالترحيب. استخدم لغة مبسّطة وجملًا قصيرة. تجنّب المصطلحات والاختصارات المحلية. اسأل باحترام عن أي احتياجات تتعلق بالوصول، وقدّم خيارات مثل إرشادات مكتوبة أو نقطة لقاء أهدأ. تحدّث بوتيرة ثابتة وواجه الزائر. تحقق من الفهم بدعوته إلى إعادة الخطوة الأساسية، لا بمجرد سؤاله إن كان قد فهم. التواصل الشامل يزيل الحواجز ليتمكن كل زائر من المشاركة.',
  'Acknowledge the change and its impact on the visitor': 'أقرّ بالتغيير وأثره على الزائر',
  'Ask one or two discovery questions about time and priorities':
    'اطرح سؤالًا أو سؤالين استكشافيين عن الوقت والأولويات',
  'Verify availability before offering anything': 'تحقق من التوفر قبل أن تعرض أي شيء',
  'Offer two feasible, confirmed options': 'اعرض خيارين ممكنين ومؤكَّدين',
  'Know when and to whom you escalate': 'اعرف متى تصعّد الأمر ولمن',
  'Confirm the next step and a follow-up message': 'أكّد الخطوة التالية وأرسل رسالة متابعة',
  'Choose one place and one visitor you are speaking to.':
    'اختر مكانًا واحدًا وزائرًا واحدًا تتحدث إليه.',
  'Pick a single memorable detail and why it matters.': 'اختر تفصيلًا واحدًا لا يُنسى ولماذا هو مهم.',
  'Close with a clear suggestion of what to see next.':
    'اختم باقتراح واضح لما يمكن زيارته بعد ذلك.',
  'Simulated AI practice': 'تدريب محاكى بالذكاء الاصطناعي',
}
