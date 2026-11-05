import type { LearningGoal } from '@shared/constants'
import { PROGRAMMES_CONTENT } from '@shared/content'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Compass } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { tr } from '@/i18n/localised'
import { ownProfileQuery } from '../queries/profile.queries'
import { OnboardingLayout } from './OnboardingLayout'
import { PreAssessmentCta } from './PreAssessmentCta'
import { ProgramBHero } from './ProgramBHero'
import { WelcomeSummary } from './WelcomeSummary'

/**
 * Program B welcome (brief §5 step 1): goals, expected time, profile completeness and
 * Start pre-assessment, explaining that the baseline is not an entry barrier.
 */
export function ProgramBWelcome() {
  const { t, i18n } = useTranslation('learner')
  const { data, isPending, isError, refetch } = useQuery(ownProfileQuery())
  if (isPending) {
    return (
      <OnboardingLayout>
        <div className="grid gap-6 md:gap-8">
          <Skeleton className="h-[22rem] rounded-xl md:h-[26rem]" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
            <div className="grid gap-4 sm:grid-cols-2">
              {['goals', 'time', 'profile', 'path'].map((key) => (
                <Skeleton key={key} className="h-48 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      </OnboardingLayout>
    )
  }
  if (isError) {
    return (
      <OnboardingLayout>
        <EmptyState
          variant="destructive"
          title={t('profile.welcome.loadFailedTitle')}
          description={t('profile.wizard.loadFailedDesc')}
          action={<Button onClick={() => refetch()}>{t('profile.common.tryAgain')}</Button>}
        />
      </OnboardingLayout>
    )
  }
  const b = data.enrolments.find((e) => e.programme === 'B')
  const firstName = data.fullName.split(' ')[0]
  if (!b) {
    return (
      <OnboardingLayout>
        <EmptyState
          icon={Compass}
          title={t('profile.welcome.notEnrolledTitle')}
          description={t('profile.welcome.notEnrolledDesc')}
          action={
            <Button asChild>
              <Link to="/programmes/$code/enrol" params={{ code: 'b' }}>
                {t('profile.welcome.startB')}
              </Link>
            </Button>
          }
        />
      </OnboardingLayout>
    )
  }
  return (
    <OnboardingLayout>
      <div className="grid gap-6 md:gap-8">
        <ProgramBHero
          firstName={firstName ?? ''}
          programmeLine={t('profile.welcome.programmeLine', {
            title: tr(PROGRAMMES_CONTENT.B.title, i18n.language),
          })}
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          <WelcomeSummary
            goals={data.goals as LearningGoal[]}
            weeklyMinutes={data.weeklyMinutes}
            durationLabel={tr(PROGRAMMES_CONTENT.B.durationLabel, i18n.language)}
            completeness={data.completeness}
            pathLine={t('profile.welcome.startingPath', {
              path: tr(b.pathName ?? '', i18n.language).replace(/^(B|ب:) /, ''),
            })}
            reason={tr(b.assignmentReason, i18n.language) ?? ''}
          />
          <PreAssessmentCta />
        </div>
      </div>
    </OnboardingLayout>
  )
}
