import type { LearningGoal } from '@shared/constants'
import { PROGRAMMES_CONTENT } from '@shared/content'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Clock, Compass, Target } from 'lucide-react'
import { ProgressRing } from '@/components/data'
import { Reveal, Stagger, StaggerItem } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { ownProfileQuery } from '../queries/profile.queries'
import { GOAL_LABEL } from '../utils/options'
import { OnboardingLayout } from './OnboardingLayout'

/**
 * Program B welcome (brief §5 step 1): goals, expected time, profile completeness and
 * Start pre-assessment, explaining that the baseline is not an entry barrier.
 */
export function ProgramBWelcome() {
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
          title="We could not load your welcome page"
          description="Check your connection and try again."
          action={<Button onClick={() => refetch()}>Try again</Button>}
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
          title="You are not enrolled on Program B"
          description="Program B, Visitor Service Essentials, is open to every learner. Join it to see your welcome."
          action={
            <Button asChild>
              <Link to="/programmes/$code/enrol" params={{ code: 'b' }}>
                Start with Program B
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
            label="Profile complete"
          />
          <p className="text-muted-foreground text-sm">
            {data.completeness < 100
              ? 'Complete the missing details to get a more specific recommendation.'
              : 'Your profile is complete, so your path matches your role.'}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to={(data.completeness < 100 ? '/onboarding' : '/learner/profile') as never}>
              {data.completeness < 100 ? 'Complete my profile' : 'Review my profile'}
            </Link>
          </Button>
        </Reveal>
      }
    >
      <div className="grid gap-10">
        <Reveal className="grid gap-4">
          <p className="font-medium text-sm text-teal">Program B: {PROGRAMMES_CONTENT.B.title}</p>
          <h1 className="font-display font-light text-4xl leading-[1.08] md:text-6xl">
            Welcome, {firstName}
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground leading-relaxed">
            One stage of short lessons and realistic practice, personalised to your role. You will
            measure your improvement from start to finish.
          </p>
        </Reveal>
        <Stagger className="grid gap-4 sm:grid-cols-2">
          <StaggerItem className="grid content-start gap-3 rounded-xl bg-white p-6 ring-1 ring-ink/5">
            <Target aria-hidden className="size-5 text-teal" />
            <p className="font-display text-xl">Your goals</p>
            <ul className="flex flex-wrap gap-2">
              {(data.goals as LearningGoal[]).length > 0 ? (
                (data.goals as LearningGoal[]).map((goal) => (
                  <li
                    key={goal}
                    className="rounded-full bg-teal-mist px-3 py-1 text-sm text-teal-deep"
                  >
                    {GOAL_LABEL[goal]}
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground text-sm">Add goals in your profile.</li>
              )}
            </ul>
          </StaggerItem>
          <StaggerItem className="grid content-start gap-3 rounded-xl bg-white p-6 ring-1 ring-ink/5">
            <Clock aria-hidden className="size-5 text-teal" />
            <p className="font-display text-xl">Expected time</p>
            <p className="text-sm">{PROGRAMMES_CONTENT.B.durationLabel}, self-paced.</p>
            {data.weeklyMinutes ? (
              <p className="text-muted-foreground text-sm">
                At {data.weeklyMinutes} minutes a week, about{' '}
                {Math.max(1, Math.ceil(75 / data.weeklyMinutes))}{' '}
                {Math.ceil(75 / data.weeklyMinutes) > 1 ? 'weeks' : 'week'}.
              </p>
            ) : null}
          </StaggerItem>
          <StaggerItem className="grid content-start gap-2 rounded-xl bg-white p-6 ring-1 ring-ink/5 sm:col-span-2">
            <p className="font-display text-xl">
              Your starting path: {b.pathName?.replace(/^B /, '')}
            </p>
            <p className="text-muted-foreground text-sm">{b.assignmentReason}</p>
          </StaggerItem>
        </Stagger>
        <Reveal className="grid gap-5 rounded-xl bg-teal-deep p-7 text-white md:p-9">
          <p className="font-display text-2xl leading-snug md:text-3xl">
            Next: a five-question baseline
          </p>
          <p className="max-w-xl text-white/85 leading-relaxed">
            The baseline identifies useful learning for you. It is not an entry barrier, and there
            is no pass mark. Your results build your recommended learning path.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="glass">
              <Link
                to="/learner/assessments/$kind"
                params={{ kind: 'pre' }}
                search={{ programme: 'B' }}
              >
                Start pre-assessment
                <ArrowRight aria-hidden className="rtl:-scale-x-100" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <Link to={'/learner/learning' as never}>Go to my learning</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </OnboardingLayout>
  )
}
