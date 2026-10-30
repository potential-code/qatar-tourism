import i18n from '@/i18n'
import { tr } from '@/i18n/localised'
import { humanise } from '@/lib/analytics/format'

const lookup = (key: string, fallback: string): string =>
  i18n.exists(key, { ns: 'learner' })
    ? (i18n.t(key as never, { ns: 'learner' }) as string)
    : fallback

const notGiven = () => lookup('aiPath.inputs.notGiven', 'Not given')

/** Labels read the active language on every call; callers re-render on language change. */
export const orgTypeLabel = (v: string | null) =>
  v ? lookup(`profile.options.organisationType.${v}`, humanise(v)) : notGiven()
export const experienceLabel = (v: string | null) =>
  v ? lookup(`aiPath.values.experience.${v}`, v) : notGiven()
export const valueLabel = (v: string | null) =>
  v
    ? lookup(
        `profile.options.jobFunction.${v}`,
        lookup(`profile.options.seniority.${v}`, lookup(`profile.options.goal.${v}`, humanise(v))),
      )
    : notGiven()

/** The recorded rule reason is built from a template plus a rule name; translate both parts. */
export function ruleReasonLabel(reason: string, lang: string): string {
  if (lang !== 'ar') return reason
  const at = (text: string) => tr(text, lang)
  const match = reason.match(/^Rule match \(priority (\d+)\): (.+)$/)
  if (match) return `تطابق قاعدة (الأولوية ${match[1]}): ${at(match[2] as string)}`
  const incomplete = reason.match(/^Default path \(profile incomplete\): (.+)$/)
  if (incomplete) return `المسار الافتراضي (الملف غير مكتمل): ${at(incomplete[1] as string)}`
  const fallback = reason.match(/^Default path: (.+)$/)
  if (fallback) return `المسار الافتراضي: ${at(fallback[1] as string)}`
  return at(reason)
}
