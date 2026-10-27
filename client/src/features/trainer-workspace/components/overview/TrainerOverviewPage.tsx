import { useQuery } from '@tanstack/react-query'
import { QueryErrorPanel } from '@/features/sessions/components/QueryErrorPanel'
import { overviewQuery } from '../../queries/trainer.queries'
import { WorkspaceSkeleton } from '../shared/WorkspaceSkeleton'
import { AttentionPanel } from './AttentionPanel'
import { FeedbackWall } from './FeedbackWall'
import { OverviewHero } from './OverviewHero'
import { OverviewStats } from './OverviewStats'
import { RescheduleActivity } from './RescheduleActivity'
import { StatusMixCard } from './StatusMixCard'
import { UpcomingTimeline } from './UpcomingTimeline'

/** Trainer Overview (brief §10). */
export function TrainerOverviewPage() {
  const overview = useQuery(overviewQuery())
  if (overview.isPending) return <WorkspaceSkeleton hero />
  if (overview.isError)
    return <QueryErrorPanel error={overview.error} onRetry={() => overview.refetch()} />
  const data = overview.data
  return (
    <div className="flex flex-col gap-8">
      <OverviewHero data={data} />
      <OverviewStats stats={data.stats} />
      <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-8">
          <UpcomingTimeline data={data} />
          <FeedbackWall data={data} />
        </div>
        <div className="flex flex-col gap-6">
          <AttentionPanel data={data} />
          <StatusMixCard data={data} />
          <RescheduleActivity data={data} />
        </div>
      </div>
    </div>
  )
}
