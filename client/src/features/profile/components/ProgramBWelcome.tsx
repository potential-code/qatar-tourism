import type { LearningGoal } from '@shared/constants'
import { PROGRAMMES_CONTENT } from '@shared/content'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Clock, Compass, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ProgressRing } from '@/components/data'
import { Reveal, Stagger, StaggerItem } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { tr } from '@/i18n/localised'
import { ownProfileQuery } from '../queries/profile.queries'
import { useOptionLabels } from '../utils/options'
import { OnboardingLayout } from './OnboardingLayout'

/**
 * Program B welcome (brief §5 step 1): goals, expected time, profile completeness and
 * Start pre-assessment, explaining that the baseline is not an entry barrier.
 */
export function ProgramBWelcome() {
  const { t, i18n } = useTranslation('learner')
  const labels = useOptionLabels()
  const { data, isPending, isError, refetch } = useQuery(ownProfileQuery())
  if (isPending) {
    return (
      <OnboardingLayout>
        <Skeleton className="h-[520px] rounded-xl" />
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
    <OnboardingLayout
      aside={
        <Reveal className="grid justify-items-center gap-4 rounded-xl bg-white p-8 text-center ring-1 ring-ink/5">
          <ProgressRing
            value={data.completeness}
            size={132}
            strokeWidth={10}
            label={t('profile.welcome.profileComplete')}
          />
          <p className="text-muted-foreground text-sm">
            {data.completeness < 100
              ? t('profile.welcome.completeMissing')
              : t('profile.welcome.profileDone')}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to={(data.completeness < 100 ? '/onboarding' : '/learner/profile') as never}>
              {data.completeness < 100
                ? t('profile.page.completeProfile')
                : t('profile.welcome.reviewProfile')}
            </Link>
          </Button>
        </Reveal>
      }
    >
      <div className="grid gap-10">
        <Reveal className="grid gap-4">
          <p className="font-medium text-sm text-teal">
            {t('profile.welcome.programmeLine', {
              title: tr(PROGRAMMES_CONTENT.B.title, i18n.language),
            })}
          </p>
          <h1 className="font-display font-light text-4xl leading-[1.08] md:text-6xl">
            {t('profile.welcome.heading', { name: firstName })}
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground leading-relaxed">
            {t('profile.welcome.intro')}
          </p>
        </Reveal>
        <Stagger className="grid gap-4 sm:grid-cols-2">
          <StaggerItem className="grid content-start gap-3 rounded-xl bg-white p-6 ring-1 ring-ink/5">
            <Target aria-hidden className="size-5 text-teal" />
            <p className="font-display text-xl">{t('profile.welcome.yourGoals')}</p>
            <ul className="flex flex-wrap gap-2">
              {(data.goals as LearningGoal[]).length > 0 ? (
                (data.goals as LearningGoal[]).map((goal) => (
                  <li
                    key={goal}
                    className="rounded-full bg-teal-mist px-3 py-1 text-sm text-teal-deep"
                  >
                    {labels.goal[goal]}
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground text-sm">{t('profile.welcome.addGoals')}</li>
              )}
            </ul>
          </StaggerItem>
          <StaggerItem className="grid content-start gap-3 rounded-xl bg-white p-6 ring-1 ring-ink/5">
            <Clock aria-hidden className="size-5 text-teal" />
            <p className="font-display text-xl">{t('profile.welcome.expectedTime')}</p>
            <p className="text-sm">
              {t('profile.welcome.selfPaced', {
                duration: tr(PROGRAMMES_CONTENT.B.durationLabel, i18n.language),
              })}
            </p>
            {data.weeklyMinutes ? (
              <p className="text-muted-foreground text-sm">
                {t(
                  Math.ceil(75 / data.weeklyMinutes) > 1
                    ? 'profile.welcome.atMinutesPlural'
                    : 'profile.welcome.atMinutes',
                  {
                    minutes: data.weeklyMinutes,
                    n: Math.max(1, Math.ceil(75 / data.weeklyMinutes)),
                  },
                )}
              </p>
            ) : null}
          </StaggerItem>
          <StaggerItem className="grid content-start gap-2 rounded-xl bg-white p-6 ring-1 ring-ink/5 sm:col-span-2">
            <p className="font-display text-xl">
              {t('profile.welcome.startingPath', {
                path: tr(b.pathName ?? '', i18n.language).replace(/^(B|ب:) /, ''),
              })}
            </p>
            <p className="text-muted-foreground text-sm">{tr(b.assignmentReason, i18n.language)}</p>
          </StaggerItem>
        </Stagger>
        <Reveal className="grid gap-5 rounded-xl bg-teal-deep p-7 text-white md:p-9">
          <p className="font-display text-2xl leading-snug md:text-3xl">
            {t('profile.welcome.nextTitle')}
          </p>
          <p className="max-w-xl text-white/85 leading-relaxed">{t('profile.welcome.nextBody')}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="glass">
              <Link
                to="/learner/assessments/$kind"
                params={{ kind: 'pre' }}
                search={{ programme: 'B' }}
              >
                {t('profile.welcome.startPre')}
                <ArrowRight aria-hidden className="rtl:-scale-x-100" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <Link to={'/learner/learning' as never}>{t('profile.welcome.goLearning')}</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </OnboardingLayout>
  )
}
