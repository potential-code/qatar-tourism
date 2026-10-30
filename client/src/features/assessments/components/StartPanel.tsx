import type { ProgrammeCode } from '@shared/constants'
import { ClipboardCheck, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { AssessmentState } from '../types'

/**
 * Before an attempt: what to expect (questions, pass requirement, time limit, remaining
 * attempts), then Start, or the reason it cannot be started. All values come from the rule.
 */
export function StartPanel({
  data,
  programme,
  title,
  pending,
  onStart,
}: {
  data: AssessmentState
  programme: ProgrammeCode
  title: string
  pending: boolean
  onStart: () => void
}) {
  const { t, i18n } = useTranslation('assessments')
  const a = data.availability
  const intro =
    data.kind === 'pre'
      ? t('intro.pre')
      : data.kind === 'formative'
        ? t('intro.formative', { mark: data.foundationPass })
        : t('intro.post', { mark: a.passMark ?? 0 })
  const reason =
    a.reasonCode === null
      ? null
      : a.reasonCode === 'locked'
        ? a.reason
        : t(`reason.${a.reasonCode}`)
  const timed = a.timeLimitMinutes !== null
  const allowed = (a.attemptLimit ?? 0) + a.extraGranted
  const stats: { label: string; value: string }[] = [
    { label: t('start.questions'), value: String(data.questionCount) },
    {
      label: t('start.passRequirement'),
      value: a.passMark === null ? t('start.noPass') : `${a.passMark}%`,
    },
    ...(a.attemptLimit !== null
      ? [
          {
            label: t('start.attempts'),
            value: t('start.attemptsValue', { left: a.attemptsRemaining ?? 0, total: allowed }),
          },
          {
            label: t('start.timeLimit'),
            value: timed ? t('start.minutes', { n: a.timeLimitMinutes }) : t('start.noLimit'),
          },
        ]
      : []),
  ]
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl leading-tight font-light text-ink md:text-4xl">
          {title}
        </h1>
        <p className="max-w-[70ch] text-muted-foreground">{intro}</p>
      </div>
      <div className="grid gap-6 rounded-xl border bg-white p-6 shadow-sm md:p-8">
        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-muted-foreground">{s.label}</dt>
              <dd className="font-display text-2xl text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>
        {a.canStart ? (
          <Button size="lg" onClick={onStart} disabled={pending} className="justify-self-start">
            <ClipboardCheck aria-hidden />{' '}
            {data.kind === 'pre' ? t('start.startPre') : t('start.start')}
          </Button>
        ) : (
          <p className="flex items-start gap-2 text-sm text-muted-foreground" role="status">
            <Lock aria-hidden className="mt-0.5 size-4 shrink-0" /> {reason}
          </p>
        )}
      </div>
      {programme === 'A' || programme === 'B' ? (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <p>{t('start.notice')}</p>
          {timed ? <p>{t('start.noticeTimed')}</p> : null}
          {i18n.language === 'ar' ? <p>{t('start.language', { lang: t('lang.ar') })}</p> : null}
        </div>
      ) : null}
    </>
  )
}
