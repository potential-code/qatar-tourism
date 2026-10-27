import { useQuery } from '@tanstack/react-query'
import { Reveal, Stagger, StaggerItem } from '@/components/motion'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicLayout } from '@/features/public-site/components/PublicLayout'
import { SectionError } from '@/features/public-site/components/SectionState'
import { programmesQuery } from '../queries/programmes.queries'
import { ProgrammeCard } from './ProgrammeCard'

/** Programme catalogue (brief §3): A and B are active; C is an illustrative sample. */
export function ProgrammesIndexPage() {
  const { data, isPending, isError, refetch } = useQuery(programmesQuery())
  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-12 px-4 pt-32 pb-24 md:px-8 md:pt-40">
        <Reveal className="flex max-w-3xl flex-col gap-4">
          <h1 className="font-display font-light text-4xl text-ink leading-[1.08] md:text-6xl">
            Programmes
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Program A and Program B are active demonstration programmes. Program C is an
            illustrative sample of a possible future offering.
          </p>
        </Reveal>
        {isPending ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[560px] rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <SectionError what="the programmes" onRetry={() => refetch()} />
        ) : (
          <Stagger className="grid gap-6 lg:grid-cols-3" stagger={0.1}>
            {data.map((programme, index) => (
              <StaggerItem key={programme.code}>
                <ProgrammeCard programme={programme} layout={index === 0 ? 'feature' : 'column'} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </PublicLayout>
  )
}
