import { AR_CURRICULUM } from '@shared/content/curriculum-ar'

/**
 * Seed copy is stored in English. `tr` and `localised` show the Arabic variant (keyed by the exact
 * English text, `shared/content/curriculum-ar.ts`) when the language is Arabic and one exists,
 * and fall back to the English text. English values, ids and counts are never changed.
 */
const EXTRA: Record<string, string> = {}

/** Lets a feature register more Arabic seed copy (e.g. role-play scenarios). */
export function registerArabicCopy(copy: Readonly<Record<string, string>>): void {
  Object.assign(EXTRA, copy)
}

/** Text in the given language; English (or text with no Arabic variant) is returned unchanged. */
export function tr(text: string, lang: string | undefined): string
export function tr(
  text: string | null | undefined,
  lang: string | undefined,
): string | null | undefined
export function tr(text: string | null | undefined, lang: string | undefined) {
  if (text == null || lang !== 'ar') return text
  return AR_CURRICULUM[text] ?? EXTRA[text] ?? trDynamic(text)
}

/**
 * Sentences the mock services assemble from a template plus seed titles ("Continue: <title>").
 * Each rule translates the template and the titles inside it.
 */
type Rule = [RegExp, (m: RegExpMatchArray) => string]
const STRENGTH: Record<string, string> = {
  'needs discovery': 'استكشاف الاحتياجات',
  'information checking': 'التحقق من المعلومات',
  'visitor communication': 'التواصل مع الزائر',
  'service recovery': 'تدارك الخدمة',
  'information protection': 'حماية المعلومات',
}
const at = (text: string) => tr(text, 'ar')
/**
 * Translates a list of titles joined by ", " and " and ". A title can itself contain " and "
 * ("Clear and inclusive communication"), so the longest run of pieces that is a known title wins.
 */
const titles = (list: string) => {
  const pieces = list.split(/(, | and )/)
  const out: string[] = []
  for (let i = 0; i < pieces.length; i += 2) {
    let end = pieces.length - 1
    while (end > i && !(pieces.slice(i, end + 1).join('') in AR_CURRICULUM)) end -= 2
    out.push(at(pieces.slice(i, end + 1).join('')))
    i = end
  }
  return out.join('، ').replace(/، ([^،]+)$/, ' و$1')
}
const RULES: Rule[] = [
  [/^Continue: (.+)$/, (m) => `تابع: ${at(m[1] as string)}`],
  [/^Start: (.+)$/, (m) => `ابدأ: ${at(m[1] as string)}`],
  [/^Recommended: (.+)$/, (m) => `موصى به: ${at(m[1] as string)}`],
  [/^Baseline gap: (.+)$/, (m) => `فجوة في التقييم الأساسي: ${at(m[1] as string)}`],
  [
    /^Your post-assessment was below (\d+) percent\. A short review .*$/,
    (m) =>
      `كانت نتيجة تقييمك البعدي أقل من ${m[1]} بالمئة. يُقترح مراجعة قصيرة للوحدات المرتبطة بأضعف مجالاتك. ولا تمنع المراجعة إكمال البرنامج.`,
  ],
  [
    /^([^.]+)\. A (\d+)-minute refresher chosen from your baseline\. .*$/,
    (m) =>
      `${at(m[1] as string)}. دورة تنشيطية مدتها ${m[2]} دقيقة اختيرت وفق تقييمك الأساسي. وهي اختيارية ولا تغيّر وحداتك الإلزامية.`,
  ],
  [
    /^Your ([^.]+) skills are strong\.$/,
    (m) => `مهاراتك في ${STRENGTH[m[1] as string] ?? m[1]} قوية.`,
  ],
  [
    /^We recommend starting with ([^.]+) because (these were your lowest baseline areas|this was your lowest baseline area)\.$/,
    (m) =>
      `نوصي بالبدء بـ${titles(m[1] as string)} لأن ${
        m[2]?.startsWith('these') ? 'هذه كانت أضعف مجالاتك' : 'هذا كان أضعف مجالاتك'
      } في التقييم الأساسي.`,
  ],
  [
    /^Your baseline shows no gaps, so we recommend the standard order of your path\.$/,
    () => 'لا يُظهر تقييمك الأساسي أي فجوات، لذا نوصي بالترتيب المعتاد لمسارك.',
  ],
  [
    /^Complete your baseline assessment so the recommendation can reflect your starting point\.$/,
    () => 'أكمل تقييمك الأساسي حتى تعكس التوصية نقطة انطلاقك.',
  ],
  [
    /^Your ([^.]+) role also benefits from ([^.]+)\.$/,
    (m) => `يفيد دورك الوظيفي أيضًا من: ${at(m[2] as string)}.`,
  ],
]

function trDynamic(text: string): string {
  // The recommendation rationale joins several sentences; translate each one.
  if (text.includes('. ') && !RULES.some(([re]) => re.test(text))) {
    const parts = text.match(/[^.]+\.(?:\s|$)/g)
    if (parts && parts.length > 1) return parts.map((part) => tr(part.trim(), 'ar')).join(' ')
  }
  for (const [re, fn] of RULES) {
    const m = text.match(re)
    if (m) return fn(m)
  }
  return text
}

/** Text fields of catalogue rows (courses, programmes, paths, path items, assessments, rules). */
const TEXT_FIELDS = [
  'title',
  'name',
  'summary',
  'description',
  'audience',
  'formatLabel',
  'durationLabel',
  'completionText',
  'stage',
  'note',
  'brief',
  'transcript',
] as const

/**
 * Returns a copy of `row` with its learner-visible text fields in the language. Fields without
 * an Arabic variant stay English; non-text fields (ids, codes, numbers) are untouched.
 */
export function localised<T extends object>(row: T, lang: string | undefined): T {
  if (lang !== 'ar') return row
  const out = { ...row } as Record<string, unknown>
  for (const field of TEXT_FIELDS) {
    const value = out[field]
    if (typeof value === 'string') out[field] = tr(value, lang)
  }
  return out as T
}
