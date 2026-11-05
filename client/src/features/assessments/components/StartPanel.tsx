import type { ProgrammeCode } from '@shared/constants'
import { ClipboardCheck, Info, ListChecks, Lock, RotateCcw, Target, Timer } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { PhotoPanel } from '@/components/brand/PhotoPanel'
import { easeOut, spring } from '@/components/motion/variants'
import { Button } from '@/components/ui/button'
import { PAGE_IMAGE } from '@/features/learning/utils/imagery'
import type { AssessmentState } from '../types'
import { StartSteps } from './StartSteps'

/**
 * Before an attempt: what to expect (questions, pass requirement or, for Program B's post, the
 * review threshold, time limit, remaining attempts), how it works, then Start, or the reason it cannot be started. All values come from
 * the rule.
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
  const reduce = useReducedMotion()
  const a = data.availability
  const intro =
    data.kind === 'pre'
      ? t('intro.pre')
      : data.kind === 'formative'
        ? t('intro.formative', { mark: data.foundationPass })
        : a.passMark === null
          ? t('intro.postB')
          : t('intro.post', { mark: a.passMark })
  const reason =
    a.reasonCode === null
      ? null
      : a.reasonCode === 'locked'
        ? a.reason
        : t(`reason.${a.reasonCode}`)
  const timed = a.timeLimitMinutes !== null
  const allowed = (a.attemptLimit ?? 0) + a.extraGranted
  const stats = [
    { icon: ListChecks, label: t('start.questions'), value: String(data.questionCount) },
    // Program B's post has no pass requirement: show the score below which review is suggested.
    a.reviewMark !== null
      ? { icon: Target, label: t('start.reviewBelow'), value: `${a.reviewMark}%` }
      : {
          icon: Target,
          label: t('start.passRequirement'),
          value: a.passMark === null ? t('start.noPass') : `${a.passMark}%`,
        },
    ...(a.attemptLimit !== null
      ? [
          {
            icon: RotateCcw,
            label: t('start.attempts'),
            value: t('start.attemptsValue', { left: a.attemptsRemaining ?? 0, total: allowed }),
          },
          {
            icon: Timer,
            label: t('start.timeLimit'),
            value: timed ? t('start.minutes', { n: a.timeLimitMinutes }) : t('start.noLimit'),
          },
        ]
      : []),
  ]
  return (
    <>
      <PhotoPanel
        src={PAGE_IMAGE.assessments.src}
        alt={PAGE_IMAGE.assessments.alt}
        fade="start"
        priority
        className="rounded-xl shadow-md"
      >
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut }}
          className="flex min-h-[17rem] max-w-2xl flex-col justify-end gap-3 p-6 pb-20 md:min-h-[19rem] md:p-10 md:pb-24"
        >
          <p className="inline-flex items-center gap-3 text-xs font-medium tracking-[0.22em] text-white/85 uppercase">
            <span aria-hidden className="h-px w-8 bg-white/60" />
            {t(`start.eyebrow.${data.kind}`)}
          </p>
          <h1 className="font-display text-4xl leading-[1.08] font-light text-white md:text-5xl">
            {title}
          </h1>
          <p className="max-w-[60ch] text-base text-white/90">{intro}</p>
        </motion.div>
      </PhotoPanel>

      <div className="qt-card-elevated relative z-10 mx-3 -mt-14 flex flex-col gap-6 rounded-xl p-5 md:mx-8 md:p-7">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex items-start gap-3 rounded-lg bg-sand p-3">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-mist text-teal"
              >
                <s.icon className="size-4" />
              </span>
              <div className="flex min-w-0 flex-col">
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className="font-display text-xl leading-tight whitespace-nowrap text-ink md:text-2xl">
                  {s.value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
        {a.canStart ? (
          <motion.div
            className="self-start"
            whileTap={reduce ? undefined : { scale: 0.97 }}
            transition={spring}
          >
            <Button size="lg" onClick={onStart} disabled={pending}>
              <ClipboardCheck aria-hidden />
              {data.kind === 'pre' ? t('start.startPre') : t('start.start')}
            </Button>
          </motion.div>
        ) : (
          <p
            className="flex items-start gap-2 rounded-lg bg-sand p-3 text-sm text-ink/80"
            role="status"
          >
            <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-maroon" /> {reason}
          </p>
        )}
      </div>

      <StartSteps kind={data.kind} count={data.questionCount} />

      {programme === 'A' || programme === 'B' ? (
        <div className="flex items-start gap-3 rounded-xl border border-teal/15 bg-teal-mist/50 p-4 text-sm text-ink/80">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
          <div className="flex flex-col gap-1">
            <p>{t('start.notice')}</p>
            {timed ? <p>{t('start.noticeTimed')}</p> : null}
            {i18n.language === 'ar' ? <p>{t('start.language', { lang: t('lang.ar') })}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
