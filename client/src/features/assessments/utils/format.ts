import type { ProgrammeCode } from '@shared/constants'
import type { TFunction } from 'i18next'
import type { AssessmentKind } from '../queries/assessments.queries'

/** The translated assessment name: the Program A post-assessment is the "Final assessment". */
export function kindLabel(
  t: TFunction<'assessments'>,
  kind: AssessmentKind,
  programme: ProgrammeCode,
): string {
  if (kind === 'post') return programme === 'A' ? t('kind.postA') : t('kind.post')
  return t(`kind.${kind}`)
}

/** Date and time in Qatar time, in the learner's language and with Western digits. */
export function formatAttemptDate(iso: string | null, language: string): string {
  if (!iso) return ''
  const locale = language === 'ar' ? 'ar-QA-u-nu-latn' : 'en-GB'
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Qatar',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

/** 14:05 for 845 seconds. */
export function clock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
