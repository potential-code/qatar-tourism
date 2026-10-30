import type { Competency, ProgrammeCode } from '@shared/constants'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type ReactNode, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { easeOut } from '@/components/motion/variants'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ApiError } from '@/lib/api-error'
import {
  type AssessmentKind,
  useExpireAttempt,
  useSaveAnswer,
  useSubmitAssessment,
} from '../queries/assessments.queries'
import type { AssessmentResult, AttemptAvailability, OpenAttempt } from '../types'
import { AssessmentTimer } from './AssessmentTimer'
import { QuestionStep } from './QuestionStep'

/**
 * The questions one at a time, saved as you go so you can leave and resume (brief §5). Shows the
 * attempt number and remaining attempts, and the time limit when the rule sets one; when the timer
 * ends the saved answers are submitted and the result says so.
 */
export function AssessmentRunner({
  attempt,
  availability,
  programme,
  kind,
  title,
  exitAction,
  onSubmitted,
}: {
  attempt: OpenAttempt
  availability: AttemptAvailability
  programme: ProgrammeCode
  kind: AssessmentKind
  title: string
  /** The "Save and exit" control, supplied by the page (it needs the router). */
  exitAction: ReactNode
  onSubmitted: (result: AssessmentResult) => void
}) {
  const { t } = useTranslation('assessments')
  const reduce = useReducedMotion()
  const queryClient = useQueryClient()
  const [answers, setAnswers] = useState<Record<string, string[]>>(attempt.answers)
  const firstOpen = attempt.questions.findIndex((q) => !(attempt.answers[q.id]?.length ?? 0))
  const [index, setIndex] = useState(firstOpen === -1 ? attempt.questions.length - 1 : firstOpen)
  const [timeUp, setTimeUp] = useState(false)
  const save = useSaveAnswer()
  const submit = useSubmitAssessment()
  const expire = useExpireAttempt()
  const total = attempt.questions.length
  const answered = attempt.questions.filter((q) => (answers[q.id]?.length ?? 0) > 0).length
  const question = attempt.questions[index]
  const [resumed] = useState(Object.keys(attempt.answers).length > 0)
  const allowed = (availability.attemptLimit ?? 0) + availability.extraGranted

  const done = useCallback(
    (result: AssessmentResult) => {
      void queryClient.invalidateQueries({ queryKey: ['assessments', programme, kind] })
      onSubmitted(result)
    },
    [queryClient, programme, kind, onSubmitted],
  )

  // The timer reached zero. The clock on screen can run a moment ahead of the service, so if the
  // deadline has not quite passed, ask again shortly.
  const attemptId = attempt.id
  const retries = useRef(0)
  const onExpire = useCallback(() => {
    setTimeUp(true)
    const ask = () =>
      expire.mutate(attemptId, {
        onSuccess: (data) => {
          if (data.expired && data.result) return done(data.result)
          if (retries.current++ < 5) window.setTimeout(ask, 1000)
        },
        onError: () => {
          if (retries.current++ < 5) window.setTimeout(ask, 1500)
        },
      })
    ask()
  }, [attemptId, done, expire.mutate])

  const change = (questionId: string, keys: string[]) => {
    if (timeUp) return
    setAnswers((prev) => ({ ...prev, [questionId]: keys }))
    if (!attempt.engine && keys.length === 0) return
    const payload = attempt.engine
      ? { attemptId: attempt.id, questionId, selected: keys }
      : {
          attemptId: attempt.id,
          competency: questionId as Competency,
          option: keys[0] as 'A' | 'B' | 'C',
        }
    save.mutate(payload, { onError: () => toast.error(t('runner.saveFailed')) })
  }

  const finish = () =>
    submit.mutate(attempt.id, {
      onSuccess: done,
      onError: (e) => toast.error(e instanceof ApiError ? e.message : t('runner.submitFailed')),
    })

  if (!question) return null
  const last = index === total - 1
  const current = answers[question.id] ?? []

  return (
    <div className="flex flex-col gap-4">
      {attempt.secondsLeft !== null ? (
        <AssessmentTimer
          secondsLeft={attempt.secondsLeft}
          limitMinutes={attempt.timeLimitMinutes}
          onExpire={onExpire}
        />
      ) : null}
      <div className="flex flex-col gap-6 rounded-xl border bg-white p-5 shadow-sm md:p-8">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
            <span className="font-medium text-ink">{title}</span>
            <span className="text-muted-foreground tabular-nums">
              {t('runner.answered', { answered, total })}
            </span>
          </div>
          {availability.attemptLimit !== null ? (
            <p className="text-sm text-muted-foreground">
              {t('runner.attemptOf', { no: attempt.attemptNo, total: allowed })} ·{' '}
              {t('runner.attemptsAfter', { n: availability.attemptsRemaining ?? 0 })}
            </p>
          ) : null}
          <Progress value={(answered / total) * 100} aria-label={t('runner.progress')} />
          {resumed ? (
            <p className="text-xs text-teal" role="status">
              {t('runner.resumed')}
            </p>
          ) : null}
          <ol className="mt-1 flex flex-wrap gap-2" aria-label={t('runner.questions')}>
            {attempt.questions.map((q, i) => {
              const isAnswered = (answers[q.id]?.length ?? 0) > 0
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-current={i === index ? 'step' : undefined}
                    aria-label={
                      isAnswered
                        ? t('runner.questionAnswered', { n: i + 1 })
                        : t('runner.questionN', { n: i + 1 })
                    }
                    className={
                      i === index
                        ? 'grid size-8 place-items-center rounded-full bg-teal text-sm font-medium text-white'
                        : isAnswered
                          ? 'grid size-8 place-items-center rounded-full bg-teal-mist text-sm text-teal-deep'
                          : 'grid size-8 place-items-center rounded-full border text-sm text-muted-foreground'
                    }
                  >
                    {isAnswered && i !== index ? <Check aria-hidden className="size-3.5" /> : i + 1}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: easeOut }}
          >
            <QuestionStep
              question={question}
              index={index}
              total={total}
              selected={current}
              disabled={timeUp}
              onChange={change}
            />
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <div className="flex gap-2">
            <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
              <ArrowLeft aria-hidden className="rtl:-scale-x-100" /> {t('runner.previous')}
            </Button>
            {exitAction}
          </div>
          {last ? (
            <Button
              size="lg"
              // Wait for the last answer to save, or the submit would find it missing.
              disabled={answered < total || save.isPending || submit.isPending || timeUp}
              onClick={finish}
            >
              {submit.isPending ? t('runner.submitting') : t('runner.submit')}
            </Button>
          ) : (
            <Button disabled={current.length === 0} onClick={() => setIndex((i) => i + 1)}>
              {t('runner.next')} <ArrowRight aria-hidden className="rtl:-scale-x-100" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
