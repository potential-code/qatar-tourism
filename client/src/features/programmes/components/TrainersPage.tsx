import { useQuery } from '@tanstack/react-query'
import { DemoBadge } from '@/components/layout'
import { Stagger, StaggerItem } from '@/components/motion'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicLayout } from '@/features/public-site/components/PublicLayout'
import { SectionError } from '@/features/public-site/components/SectionState'
import { trainersQuery } from '../queries/programmes.queries'
import { PublicPageIntro } from './PublicPageIntro'
import { TrainerCard } from './TrainerCard'

const SKELETONS = Array.from({ length: 10 }, (_, i) => `trainer-skeleton-${i}`)

/** All ten fictional trainers (brief §16). */
export function TrainersPage() {
  const { data, isPending, isError, refetch } = useQuery(trainersQuery())
  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-10 px-4 pt-32 pb-24 md:px-8 md:pt-40">
        <PublicPageIntro title="Our trainers">
          Coaches and facilitators who lead the Academy’s in-person and live-online sessions.
        </PublicPageIntro>
        <DemoBadge className="w-fit" />
        {isPending ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {SKELETONS.map((key) => (
              <Skeleton key={key} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <SectionError what="the trainers" onRetry={() => refetch()} />
        ) : (
          <Stagger
            className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
            stagger={0.05}
          >
            {data.map((trainer) => (
              <StaggerItem key={trainer.code}>
                <TrainerCard trainer={trainer} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </PublicLayout>
  )
}
