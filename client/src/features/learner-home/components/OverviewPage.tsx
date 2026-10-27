import { useQuery } from '@tanstack/react-query'
import { Stagger, StaggerItem } from '@/components/motion/Reveal'
import { LoadError } from '@/features/learning/components/LoadError'
import { type ProgrammeContext, WithProgramme } from '@/features/learning/components/WithProgramme'
import { journeyQuery } from '@/features/learning/queries/learning.queries'
import { CompetencyCard } from './CompetencyCard'
import { CompletionCelebration } from './CompletionCelebration'
import { FeedbackCard } from './FeedbackCard'
import { JourneyCard } from './JourneyCard'
import { NextActionCard } from './NextActionCard'
import { OverviewSkeleton } from './OverviewSkeleton'
import { RecommendationCard } from './RecommendationCard'
import { ScoreCard } from './ScoreCard'
import { WelcomeHero } from './WelcomeHero'

/** Learner Overview (brief §5 "Dashboard content"). */
export function OverviewPage() {
  return (
    <WithProgramme skeleton={<OverviewSkeleton />}>{(ctx) => <Overview ctx={ctx} />}</WithProgramme>
  )
}

function Overview({ ctx }: { ctx: ProgrammeContext }) {
  const journey = useQuery(journeyQuery(ctx.programme))
  if (journey.isLoading) return <OverviewSkeleton />
  if (journey.error || !journey.data) {
    return <LoadError error={journey.error} onRetry={() => void journey.refetch()} />
  }
  const data = journey.data
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col">
        <WelcomeHero
          journey={data}
          enrolments={ctx.enrolments}
          programme={ctx.programme}
          onProgramme={ctx.setProgramme}
        />
        <NextActionCard journey={data} />
      </div>
      {data.complete ? <CompletionCelebration journey={data} /> : null}
      <Stagger className="grid gap-6 lg:grid-cols-12">
        <StaggerItem className="*:h-full lg:col-span-7">
          <JourneyCard journey={data} />
        </StaggerItem>
        <StaggerItem className="*:h-full lg:col-span-5">
          <ScoreCard journey={data} />
        </StaggerItem>
        <StaggerItem className="*:h-full lg:col-span-7">
          <CompetencyCard journey={data} />
        </StaggerItem>
        <StaggerItem className="*:h-full lg:col-span-5">
          <FeedbackCard journey={data} />
        </StaggerItem>
        {data.recommendation || !data.complete ? (
          <StaggerItem className="*:h-full lg:col-span-12">
            <RecommendationCard journey={data} />
          </StaggerItem>
        ) : null}
      </Stagger>
    </div>
  )
}
