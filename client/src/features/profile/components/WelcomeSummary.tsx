import type { LearningGoal } from '@shared/constants'
import { Link } from '@tanstack/react-router'
import { Clock, type LucideIcon, Route, Target, UserRoundCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ProgressRing } from '@/components/data'
import { Stagger, StaggerItem } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GOAL_ICON } from '../utils/goal-icons'
import { useOptionLabels } from '../utils/options'

/** One summary card: icon tile, serif title and content (brief §5 step 1 facts). */
function SummaryCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <StaggerItem
      className={cn(
        'qt-lift grid content-start gap-4 rounded-xl border border-teal-night/8 bg-white p-6',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-10 place-items-center rounded-lg bg-gradient-to-br from-teal-mist to-sky-mist text-teal ring-1 ring-teal/10"
        >
          <Icon className="size-5" />
        </span>
        <h2 className="font-display text-xl">{title}</h2>
      </div>
      {children}
    </StaggerItem>
  )
}

/** Goals, expected time, profile completeness and the starting path, as designed cards. */
export function WelcomeSummary({
  goals,
  weeklyMinutes,
  durationLabel,
  completeness,
  pathLine,
  reason,
}: {
  goals: readonly LearningGoal[]
  weeklyMinutes: number | null
  durationLabel: string
  completeness: number
  pathLine: string
  reason: string
}) {
  const { t } = useTranslation('learner')
  const labels = useOptionLabels()
  const weeks = weeklyMinutes ? Math.max(1, Math.ceil(75 / weeklyMinutes)) : 0
  const incomplete = completeness < 100
  return (
    <Stagger className="grid content-start gap-4 sm:grid-cols-2">
      <SummaryCard icon={Target} title={t('profile.welcome.yourGoals')}>
        <ul className="grid gap-2">
          {goals.length > 0 ? (
            goals.map((goal) => {
              const Icon = GOAL_ICON[goal]
              return (
                <li
                  key={goal}
                  className="flex items-center gap-2.5 rounded-full bg-teal-mist py-1.5 ps-1.5 pe-4 text-sm text-teal-deep"
                >
                  <span
                    aria-hidden
                    className="grid size-7 place-items-center rounded-full bg-white text-teal"
                  >
                    <Icon className="size-3.5" />
                  </span>
                  {labels.goal[goal]}
                </li>
              )
            })
          ) : (
            <li className="text-muted-foreground text-sm">{t('profile.welcome.addGoals')}</li>
          )}
        </ul>
      </SummaryCard>

      <SummaryCard icon={Clock} title={t('profile.welcome.expectedTime')}>
        {weeklyMinutes ? (
          <p className="flex items-baseline gap-2">
            <span className="font-display font-light text-5xl text-teal-deep leading-none">
              {weeklyMinutes}
            </span>
            <span className="text-muted-foreground text-sm">{t('profile.onboarding.perWeek')}</span>
          </p>
        ) : null}
        <div className="grid gap-1 text-sm">
          <p>{t('profile.welcome.selfPaced', { duration: durationLabel })}</p>
          {weeklyMinutes ? (
            <p className="text-muted-foreground">
              {t(weeks > 1 ? 'profile.welcome.atMinutesPlural' : 'profile.welcome.atMinutes', {
                minutes: weeklyMinutes,
                n: weeks,
              })}
            </p>
          ) : null}
        </div>
      </SummaryCard>

      <SummaryCard icon={UserRoundCheck} title={t('profile.welcome.profileComplete')}>
        <div className="flex items-center gap-5">
          <ProgressRing
            value={completeness}
            size={96}
            strokeWidth={8}
            ariaLabel={t('profile.welcome.profileComplete')}
            className="shrink-0"
          />
          <div className="grid justify-items-start gap-3">
            <p className="text-muted-foreground text-sm">
              {incomplete ? t('profile.welcome.completeMissing') : t('profile.welcome.profileDone')}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to={(incomplete ? '/onboarding' : '/learner/profile') as never}>
                {incomplete
                  ? t('profile.page.completeProfile')
                  : t('profile.welcome.reviewProfile')}
              </Link>
            </Button>
          </div>
        </div>
      </SummaryCard>

      <StaggerItem className="relative grid gap-2 overflow-hidden rounded-xl border border-teal-night/8 bg-white p-6 ps-7">
        <span
          aria-hidden
          className="absolute inset-y-0 start-0 w-1 bg-gradient-to-b from-teal via-sky to-maroon"
        />
        <p className="flex items-center gap-2.5 font-display text-xl">
          <Route aria-hidden className="size-5 shrink-0 text-teal" />
          {pathLine}
        </p>
        <p className="max-w-3xl text-muted-foreground text-sm leading-relaxed">{reason}</p>
      </StaggerItem>
    </Stagger>
  )
}
