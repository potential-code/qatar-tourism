import { CircleCheck, CircleMinus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { AssessmentResult } from '../types'

/** The question-by-question review, shown when the rule releases feedback. */
export function ResultReview({ review }: { review: AssessmentResult['review'] }) {
  const { t } = useTranslation('assessments')
  if (review.length === 0) return null
  return (
    <section aria-labelledby="review-title" className="flex flex-col gap-3">
      <h2 id="review-title" className="font-display text-2xl font-normal text-ink md:text-3xl">
        {t('result.reviewTitle')}
      </h2>
      <ol className="grid gap-3" aria-labelledby="review-title">
        {review.map((q, i) => (
          <li
            key={q.id}
            lang={q.language}
            dir={q.language === 'ar' ? 'rtl' : 'ltr'}
            className="qt-card-elevated flex flex-col gap-3 rounded-xl p-4 md:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="flex items-start gap-3 font-medium text-ink">
                <span
                  aria-hidden
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-teal-mist font-display text-sm text-teal-deep tabular-nums"
                >
                  {i + 1}
                </span>
                <span className="pt-0.5">{q.prompt}</span>
              </p>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                  q.isCorrect ? 'bg-teal-mist text-teal-deep' : 'bg-maroon-mist text-maroon-deep',
                )}
              >
                {q.isCorrect ? (
                  <CircleCheck aria-hidden className="size-3.5" />
                ) : (
                  <CircleMinus aria-hidden className="size-3.5" />
                )}
                {q.isCorrect ? t('result.correct') : t('result.incorrect')}
              </span>
            </div>
            <dl className="grid gap-1.5 rounded-lg bg-sand p-3 text-sm">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">{t('result.yourAnswer')}:</dt>
                <dd className="text-ink">
                  {q.answered ? q.selectedText.join(' · ') : t('result.notAnswered')}
                </dd>
              </div>
              {!q.isCorrect ? (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">{t('result.correctAnswer')}:</dt>
                  <dd className="text-ink">{q.correctText.join(' · ')}</dd>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">{t('result.feedback')}:</dt>
                <dd className="text-ink/80">{q.feedback}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </section>
  )
}
