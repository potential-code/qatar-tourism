/**
 * Arabic variants of the AI practice and assignment-rubric copy (29 Oct update), keyed by the
 * exact English text so English values stay untouched. Shown through `tr()` / `localised()`
 * (client/src/i18n/localised.ts). The scripted visitor lines are demonstration material.
 */
export const AR_PRACTICE: Readonly<Record<string, string>> = {
  // Scenario titles
  'Changed booking': 'تغيّر الحجز',
  'Unclear directions': 'اتجاهات غير واضحة',
  'Accessibility preference': 'احتياج إلى تسهيلات الوصول',
  'Group running late': 'مجموعة متأخرة عن الموعد',
  // Visitor openings
  'I booked this experience for today and now I am told it is unavailable. What can you do?':
    'حجزتُ هذه التجربة لهذا اليوم، والآن يُقال لي إنها غير متاحة. ماذا يمكنك أن تفعل؟',
  'I am lost and worried I will miss the meeting point.':
    'لقد ضللت الطريق وأخشى أن يفوتني موعد نقطة اللقاء.',
  'We want to join, but one person in our group needs step-free access.':
    'نرغب في المشاركة، لكن أحد أفراد مجموعتنا يحتاج إلى مسار بلا درجات.',
  'Half our group has not arrived and we do not want to lose our session.':
    'لم يصل نصف مجموعتنا بعد، ولا نريد أن نخسر جلستنا.',
  // Learner objectives
  'Acknowledge, clarify constraints, propose two feasible options and confirm follow-up.':
    'أقرّ بالموقف، واستوضح القيود، واقترح خيارين ممكنين، وأكّد المتابعة.',
  'Ask current location without requesting unnecessary personal data; give clear verified instructions and check understanding.':
    'اسأل عن الموقع الحالي دون طلب بيانات شخصية غير لازمة، وقدّم إرشادات واضحة وموثوقة، وتأكّد من الفهم.',
  'Ask respectfully about requirements, verify suitability and offer an appropriate alternative if uncertain.':
    'اسأل باحترام عن الاحتياجات، وتحقّق من ملاءمة التجربة، وقدّم بديلًا مناسبًا عند عدم التأكد.',
  'Clarify the situation, explain the stated demo policy and escalate without inventing exceptions.':
    'استوضح الموقف، واشرح السياسة التجريبية المعلنة، وصعِّد الأمر دون اختلاق استثناءات.',
  // Scripted visitor follow-ups
  'We only have the afternoon free, and there are four of us.':
    'وقتنا متاح بعد الظهر فقط، ونحن أربعة أشخاص.',
  'Those options sound possible. Which one would you suggest?':
    'تبدو هذه الخيارات ممكنة. أيّها تقترح؟',
  'Fine. What happens if that one also falls through?': 'حسنًا. وماذا لو لم يتحقق هذا الخيار أيضًا؟',
  'Okay. Can you confirm what happens next?': 'حسنًا. هل يمكنك تأكيد ما سيحدث بعد ذلك؟',
  'Thank you. I feel a little better about it.': 'شكرًا لك. أشعر بتحسّن بسيط تجاه الأمر.',
  'I am near a large fountain, I think. There is a coffee shop opposite.':
    'أظن أنني قرب نافورة كبيرة. يوجد مقهى في الجهة المقابلة.',
  'Walk past the coffee shop and then where? I am getting confused.':
    'أمرّ بجانب المقهى ثم إلى أين؟ بدأت أرتبك.',
  'Okay, let me repeat that back to you.': 'حسنًا، دعني أعيد عليك ما فهمته.',
  'That makes sense. Thank you for being patient.': 'هذا واضح. شكرًا لصبرك.',
  'She uses a wheelchair and cannot manage steps or long uneven paths.':
    'هي تستخدم كرسيًا متحركًا ولا تستطيع صعود الدرجات ولا السير في مسارات طويلة غير مستوية.',
  'So is the route suitable, or not?': 'إذن، هل المسار مناسب أم لا؟',
  'An alternative would be welcome. What would you suggest?': 'سنرحّب ببديل. ماذا تقترح؟',
  'Please confirm that you will check and come back to us.': 'أرجو تأكيد أنك ستتحقق وتعود إلينا.',
  'Thank you for taking this seriously.': 'شكرًا لأنك أخذت الأمر على محمل الجد.',
  'They are about twenty minutes away. Can you hold the session?':
    'سيصلون خلال نحو عشرين دقيقة. هل يمكنك إبقاء الجلسة لنا؟',
  'Surely you can make an exception just this once?': 'بالتأكيد يمكنكم عمل استثناء لمرة واحدة فقط؟',
  'Who decides that, and how long will it take?': 'من يقرر ذلك، وكم سيستغرق الأمر؟',
  'Okay. Please let us know as soon as you hear.': 'حسنًا. أرجو إبلاغنا فور وصول الرد.',
  'Understood. Thank you for being straightforward.': 'مفهوم. شكرًا لصراحتك ووضوحك.',
  // Labels
  'Simulated AI practice': 'تدريب محاكى بالذكاء الاصطناعي',
  'Prerecorded demonstration': 'عرض توضيحي مسجّل مسبقًا',
  'Recorded demonstration was used': 'استُخدم العرض التوضيحي المسجّل',
  Introductory: 'مبتدئ',
  Intermediate: 'متوسط',
  Advanced: 'متقدّم',
  // Competencies
  'Discover needs': 'استكشاف الاحتياجات',
  'Verify information': 'التحقق من المعلومات',
  'Communicate clearly': 'التواصل بوضوح',
  'Recover service': 'تدارك الخدمة',
  'Protect information': 'حماية المعلومات',
  // Role-play rubric
  'Empathy and professionalism': 'التعاطف والمهنية',
  'Discovery questions': 'أسئلة الاستكشاف',
  Clarity: 'الوضوح',
  'Accuracy and boundaries': 'الدقة والحدود',
  'Solution and follow-through': 'الحل والمتابعة',
  // Assignment rubric
  'Two feasible options': 'خياران ممكنان',
  'Escalation path': 'مسار التصعيد',
  'Follow-up message': 'رسالة المتابعة',
}
