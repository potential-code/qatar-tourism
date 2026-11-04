import { isArabicLanguage } from '@/lib/demo-sample'

/**
 * Presenter sample answers for the learner assignments. Fictional visitors, staff and places.
 * Word counts: the response plans are 300–500 words (A-ASSIGN-1), the short responses
 * 100–150 words (B-SHORT-1). `sample-answers.test.ts` checks both ranges in both languages.
 */

const PLAN_EN = `Situation: Mr and Mrs Okafor booked a sunset dhow cruise from the Corniche for their tenth anniversary. At 15:00 the marine operator cancels all evening sailings because of strong winds. The couple arrive at the front desk at 15:30, dressed for the evening and clearly disappointed.

1. Acknowledge and listen
I will greet them by name, move us to a quiet corner of the lobby and say: "I am sorry, I know this evening matters to you. The operator has cancelled every sailing tonight for safety reasons." I will let them speak without interrupting and note what they say.

2. Discovery questions
- What were you most looking forward to: the sea, the sunset view or a private dinner?
- How much time do you have in Doha after tonight?
- Is there anything about walking distance, food or budget I should keep in mind?
- Would you prefer something calm, or something lively with music and people?

3. Two feasible options
Option one: rebook the same dhow cruise for tomorrow at sunset. I will confirm with the operator that the forecast is better, hold two seats and ask the operator to waive any change fee. The refund for tonight stays in place if tomorrow is also cancelled.
Option two: tonight, a table on a terrace overlooking the water, followed by a guided evening walk through the souq with our concierge colleague. I will check availability before I offer it, give the price in writing and explain that this replaces the cruise rather than adding to it.
I will present both options with the times, prices and what happens if the weather changes again, and let the guests choose. I will not promise anything I have not confirmed.

4. Escalation path
If the guests are still unhappy, or ask for compensation beyond the operator's refund, I will explain that I am bringing in my duty manager, Ms Al Rashid, who can approve a gesture such as a room upgrade or a complimentary dinner. I will brief her privately first so the guests do not have to repeat their story. If the operator refuses to refund, I will log the case with our guest relations team the same day.

5. Follow-up message
Within one hour of the decision I will send a short written message to the guests: "Dear Mr and Mrs Okafor, thank you for your patience today. Your dhow cruise is confirmed for tomorrow at 17:15 from the Corniche pier, and your refund for tonight is being processed. If the weather changes we will call you by 14:00. Happy anniversary from all of us at the front desk." The next morning I will check the forecast, confirm with the operator and update the guests.

What I learned: listening first, confirming before offering, and writing down the next step keeps a disappointed guest's trust.`

const PLAN_AR = `الموقف: حجز السيد والسيدة أوكافور رحلة غروب على متن قارب تقليدي من الكورنيش بمناسبة الذكرى العاشرة لزواجهما. في الساعة الثالثة عصرًا ألغت شركة الرحلات البحرية جميع الرحلات المسائية بسبب الرياح القوية. وصل الزوجان إلى مكتب الاستقبال في الثالثة والنصف وهما مستعدان للأمسية وخيبة الأمل واضحة عليهما.

١. الاعتراف والإصغاء
سأرحب بهما بالاسم، وأنتقل معهما إلى ركن هادئ في البهو، وأقول: "أنا آسف، أعرف أن هذه الأمسية مهمة لكما. ألغت الشركة كل الرحلات الليلة حفاظًا على السلامة". سأتركهما يتحدثان دون مقاطعة وأدوّن ما يقولانه.

٢. أسئلة الاستكشاف
- ما الذي كنتما تتطلعان إليه أكثر: البحر، أم منظر الغروب، أم عشاء خاص؟
- كم من الوقت لديكما في الدوحة بعد الليلة؟
- هل هناك ما يجب أن أراعيه بخصوص المشي أو الطعام أو الميزانية؟
- هل تفضلان أمسية هادئة، أم أجواء حيوية فيها موسيقى وناس؟

٣. خياران عمليان
الخيار الأول: إعادة حجز رحلة القارب نفسها غدًا وقت الغروب. سأتأكد من الشركة أن توقعات الطقس أفضل، وأحجز مقعدين، وأطلب إعفاءهما من رسوم التغيير. ويبقى استرداد مبلغ الليلة قائمًا إذا أُلغيت رحلة الغد أيضًا.
الخيار الثاني: الليلة، طاولة على شرفة تطل على البحر، تليها جولة مسائية مع زميلنا في الكونسيرج في السوق. سأتحقق من التوفر قبل أن أعرضه، وأقدّم السعر مكتوبًا، وأوضح أن هذا بديل عن الرحلة وليس إضافة إليها.
سأعرض الخيارين مع المواعيد والأسعار وما يحدث إذا تغيّر الطقس مرة أخرى، وأترك الاختيار للضيفين. ولن أعد بشيء لم أتأكد منه.

٤. مسار التصعيد
إذا بقي الضيفان غير راضيين، أو طلبا تعويضًا يتجاوز استرداد الشركة، سأوضح أنني سأستعين بمديرة المناوبة السيدة الراشد، التي يمكنها الموافقة على لفتة مثل ترقية الغرفة أو عشاء مجاني. سأطلعها على التفاصيل أولًا على انفراد حتى لا يضطر الضيفان إلى تكرار قصتهما. وإذا رفضت الشركة الاسترداد، سأسجل الحالة لدى فريق علاقات الضيوف في اليوم نفسه.

٥. رسالة المتابعة
خلال ساعة من اتخاذ القرار سأرسل إلى الضيفين رسالة مكتوبة قصيرة: "عزيزي السيد أوكافور وعزيزتي السيدة أوكافور، شكرًا على صبركما اليوم. رحلتكما مؤكدة غدًا في الساعة الخامسة والربع مساءً من رصيف الكورنيش، ويجري الآن استرداد مبلغ الليلة. إذا تغيّر الطقس سنتصل بكما قبل الثانية ظهرًا. كل عام وأنتما بخير من فريق الاستقبال". وفي صباح اليوم التالي سأتحقق من الطقس، وأتأكد من الشركة، وأبلغ الضيفين بالمستجدات.

ما تعلمته: الإصغاء أولًا، والتأكد قبل العرض، وكتابة الخطوة التالية، كلها تحافظ على ثقة الضيف حتى عندما يشعر بخيبة الأمل.`

const SHORT_EN = `Good afternoon Ms Lindqvist, thank you for letting us know that your flight now lands at 23:40 instead of 18:00. I am sorry your first evening in Doha has changed, and I understand how tiring a late arrival can be.

So that I can plan the right welcome for you, may I ask one question: would you still like the desert safari tomorrow at 08:00, or would a later start suit you better after the long journey?

Here is the next step. I have kept your room and your airport transfer, and the driver will now meet you at arrivals at 23:40 with a sign showing your name. As soon as you reply, I will confirm the safari time in writing.

Warm regards, Front Office, Pearl Bay Hotel`

const SHORT_AR = `مساء الخير السيدة ليندكفيست، شكرًا لإبلاغنا بأن رحلتك ستصل الآن في الساعة الحادية عشرة وأربعين دقيقة ليلًا بدلًا من السادسة مساءً. يؤسفني أن أمسيتك الأولى في الدوحة قد تغيّرت، وأتفهم مدى الإرهاق الذي يسببه الوصول المتأخر.

حتى أُعدّ لك الاستقبال المناسب، هل تسمحين لي بسؤال واحد: هل ما زلتِ ترغبين في رحلة السفاري الصحراوية غدًا في الثامنة صباحًا، أم يناسبك موعد لاحق بعد هذه الرحلة الطويلة؟

هذه هي الخطوة التالية: احتفظنا بغرفتك وبخدمة التوصيل من المطار، وسيستقبلك السائق في صالة الوصول عند الحادية عشرة وأربعين دقيقة حاملًا لوحة باسمك. وفور وصول ردّك سأؤكد لك موعد السفاري كتابيًا. نتمنى لك إقامة مريحة وممتعة.

مع أطيب التحيات، مكتب الاستقبال، فندق خليج اللؤلؤ`

/** Picks the response plan (Program A) or the short response (Program B) by the word limit. */
export function sampleSubmission(
  assignment: { wordMax: number | null; allowsUpload: boolean },
  lang: string,
): string {
  const arabic = isArabicLanguage(lang)
  const short = !assignment.allowsUpload && (assignment.wordMax ?? 500) <= 200
  if (short) return arabic ? SHORT_AR : SHORT_EN
  return arabic ? PLAN_AR : PLAN_EN
}

export const SAMPLE_SUBMISSIONS = { PLAN_EN, PLAN_AR, SHORT_EN, SHORT_AR } as const
