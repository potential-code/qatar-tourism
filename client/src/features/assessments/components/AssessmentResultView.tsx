import type { ProgrammeCode } from '@shared/constants'
import { Link } from '@tanstack/react-router'
import { LifeBuoy, LockKeyhole, RotateCcw, Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { AssessmentResult } from '../types'
import { kindLabel } from '../utils/format'
import { CompetencyResults } from './CompetencyResults'
import { ImprovementBanner } from './ImprovementBanner'
import { ResultHero } from './ResultHero'
import { ResultReview } from './ResultReview'
import { SkillGapsPanel } from './SkillGapsPanel'

/**
 * The result: score and verdict, whether the time limit ended the attempt, attempts left,
 * improvement against the baseline, skill gaps with "Build my learning path", results by
 * competency, and the question review.
 */
export function AssessmentResultView({
  result,
  programme,
  canRetry,
  onRetry,
}: {
  result: AssessmentResult
  programme: ProgrammeCode
  canRetry: boolean
  onRetry?: () => void
}) {
  const { t } = useTranslation('assessments')
  const title = kindLabel(t, result.kind, programme)
  // Program B's post has no pass mark: with a counted score at or above the review threshold there
  // is nothing to ask support for, even when every attempt is used.
  const settled =
    result.gate === 'advisory' &&
    result.reviewMark !== null &&
    (result.counted ?? 0) >= result.reviewMark

  return (
    <div className="flex flex-col gap-8">
      <ResultHero result={result} title={title} />

      {result.autoSubmitted ? (
        <section
          role="status"
          className="flex items-start gap-3 rounded-xl border border-maroon/30 bg-maroon-mist p-4 text-maroon-deep"
        >
          <Timer aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div className="flex flex-col gap-1">
            <h2 className="font-medium">{t('result.autoTitle')}</h2>
            <p className="text-sm">
              {t('result.autoBody', {
                answered: result.answeredCount,
                total: result.questionCount,
              })}
            </p>
          </div>
        </section>
      ) : null}

      {result.limitReached && !settled ? (
        <section
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-maroon/30 bg-white p-4"
        >
          <LifeBuoy aria-hidden className="mt-0.5 size-5 shrink-0 text-maroon" />
          <div className="flex flex-col gap-1">
            <h2 className="font-medium text-maroon">{t('result.limitReached')}</h2>
            <p className="text-sm text-ink/80">{t('result.limitHelp')}</p>
          </div>
        </section>
      ) : null}

      {result.comparison ? (
        <ImprovementBanner
          comparison={result.comparison}
          programme={programme}
          policy={result.scorePolicy}
        />
      ) : null}

      {result.kind === 'pre' ? <SkillGapsPanel gaps={result.gaps} programme={programme} /> : null}

      <CompetencyResults competencies={result.competencies} programme={programme} />

      {result.feedbackHeld ? (
        <p
          className="flex items-center gap-2 rounded-xl border bg-white p-4 text-sm text-muted-foreground"
          role="status"
        >
          <LockKeyhole aria-hidden className="size-4 shrink-0 text-teal" />
          {result.gate === 'advisory' ? t('result.feedbackHeldB') : t('result.feedbackHeld')}
        </p>
      ) : (
        <ResultReview review={result.review} />
      )}

      <div className="flex flex-wrap gap-3 border-t border-ink/10 pt-6">
        {canRetry && onRetry ? (
          <Button
            size="lg"
            variant={result.kind === 'pre' ? 'outline' : 'default'}
            onClick={onRetry}
          >
            <RotateCcw aria-hidden /> {t('result.retry')}
          </Button>
        ) : null}
        <Button asChild size="lg" variant="outline">
          <Link to="/learner/assessments" search={{ programme }}>
            {t('result.all')}
          </Link>
        </Button>
      </div>
    </div>
  )
}
