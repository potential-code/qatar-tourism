import { Check, History } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { CornerPattern } from '@/components/brand/CornerPattern'
import { cn } from '@/lib/utils'
import type { OpenAttempt } from '../types'

/**
 * The runner's night-teal header: the assessment and version, "N of M answered" in words, the
 * attempt line, a progress bar, and a question map to jump between questions. Answered questions
 * show a tick and say "answered" in their accessible name, so state is never colour alone.
 */
export function RunnerHeader({
  title,
  questions,
  answers,
  index,
  attemptLine,
  resumed,
  onJump,
}: {
  title: string
  questions: OpenAttempt['questions']
  answers: Record<string, string[]>
  index: number
  attemptLine: string | null
  resumed: boolean
  onJump: (index: number) => void
}) {
  const { t } = useTranslation('assessments')
  const reduce = useReducedMotion()
  const total = questions.length
  const answered = questions.filter((q) => (answers[q.id]?.length ?? 0) > 0).length
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100)
  return (
    <div className="qt-grain relative isolate flex flex-col gap-4 overflow-hidden bg-grad-night p-5 text-white md:p-7">
      <CornerPattern tone="dark" className="opacity-60" />
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm font-medium text-white/90">{title}</span>
        <span className="text-sm text-white/80 tabular-nums">
          {t('runner.answered', { answered, total })}
        </span>
      </div>
      {attemptLine ? <p className="-mt-2 text-sm text-white/75">{attemptLine}</p> : null}
      <div
        role="progressbar"
        aria-label={t('runner.progress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-1.5 overflow-hidden rounded-full bg-white/15"
      >
        <div
          className={cn(
            'h-full rounded-full bg-teal-soft',
            !reduce && 'transition-[width] duration-500 ease-out',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="flex flex-wrap gap-2" aria-label={t('runner.questions')}>
        {questions.map((q, i) => {
          const isAnswered = (answers[q.id]?.length ?? 0) > 0
          const current = i === index
          return (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => onJump(i)}
                aria-current={current ? 'step' : undefined}
                aria-label={
                  isAnswered
                    ? t('runner.questionAnswered', { n: i + 1 })
                    : t('runner.questionN', { n: i + 1 })
                }
                className={cn(
                  'grid size-9 place-items-center rounded-full text-sm font-medium tabular-nums transition-[background-color,box-shadow,color] duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-white/70',
                  current
                    ? 'bg-white text-teal-deep shadow-md ring-4 ring-white/20'
                    : isAnswered
                      ? 'bg-teal-soft text-teal-night hover:bg-white'
                      : 'border border-white/40 text-white/85 hover:border-white hover:bg-white/10',
                )}
              >
                {isAnswered && !current ? <Check aria-hidden className="size-4" /> : i + 1}
              </button>
            </li>
          )
        })}
      </ol>
      {resumed ? (
        <p
          className="inline-flex items-center gap-2 self-start rounded-full bg-white/10 px-3 py-1 text-xs text-white/90"
          role="status"
        >
          <History aria-hidden className="size-3.5" /> {t('runner.resumed')}
        </p>
      ) : null}
    </div>
  )
}
