import { useQuery } from '@tanstack/react-query'
import { SectionHeading } from '@/components/brand'
import { Reveal, Stagger, StaggerItem } from '@/components/motion'
import { Skeleton } from '@/components/ui/skeleton'
import { ProgrammeCard } from '@/features/programmes/components/ProgrammeCard'
import { programmesQuery } from '@/features/programmes/queries/programmes.queries'
import { SectionError } from './SectionState'

/** "Find your next learning journey" (brief §2): A as the feature card, B and C beside it. */
export function ProgrammesSection() {
  const { data, isPending, isError, refetch } = useQuery(programmesQuery())
  return (
    <section
      id="programmes"
      tabIndex={-1}
      aria-labelledby="programmes-title"
      className="scroll-mt-20 outline-none"
    >
      <div className="mx-auto flex max-w-[1400px] flex-col gap-12 px-4 py-24 md:px-8 md:py-32">
        <Reveal>
          <SectionHeading
            title={<span id="programmes-title">Find your next learning journey</span>}
            description="Three programmes, each with a different shape. Start where your role and goals point you, and add another programme at any time."
          />
        </Reveal>
        {isPending ? (
          <div className="grid gap-6 lg:grid-cols-12">
            <Skeleton className="h-[640px] rounded-xl lg:col-span-7 lg:row-span-2" />
            <Skeleton className="h-[300px] rounded-xl lg:col-span-5" />
            <Skeleton className="h-[300px] rounded-xl lg:col-span-5" />
          </div>
        ) : isError ? (
          <SectionError what="the programmes" onRetry={() => refetch()} />
        ) : (
          <Stagger className="grid gap-6 lg:grid-cols-12" stagger={0.12}>
            {data.map((programme, index) => (
              <StaggerItem
                key={programme.code}
                className={index === 0 ? 'lg:col-span-7 lg:row-span-2' : 'lg:col-span-5'}
              >
                <ProgrammeCard programme={programme} layout={index === 0 ? 'feature' : 'row'} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </section>
  )
}
