import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CornerPattern, Eyebrow, SectionHeading } from '@/components/brand'
import { ScrollReveal, SplitWords } from '@/components/motion'
import { Skeleton } from '@/components/ui/skeleton'
import { ProgrammeShowcaseCard } from '@/features/programmes/components/ProgrammeShowcaseCard'
import { programmesQuery } from '@/features/programmes/queries/programmes.queries'
import { SectionError } from './SectionState'

/**
 * "Find your next learning journey" (brief §2): the three programmes side by side as equals,
 * each in its own brand colour, on a warm ground with soft teal, sky and rose light.
 */
export function ProgrammesSection() {
  const { t } = useTranslation('public')
  const { data, isPending, isError, refetch } = useQuery(programmesQuery())
  return (
    <section
      id="programmes"
      tabIndex={-1}
      aria-labelledby="programmes-title"
      className="relative isolate scroll-mt-20 overflow-hidden bg-sand outline-none"
    >
      <CornerPattern side="b" />
      <div
        aria-hidden
        className="absolute -start-40 top-1/4 -z-10 size-[460px] qt-glow text-sky/20"
      />
      <div
        aria-hidden
        className="absolute end-1/4 -bottom-40 -z-10 size-[420px] qt-glow text-rose/15"
      />

      <ScrollReveal className="mx-auto flex max-w-[1400px] flex-col gap-14 px-4 py-24 md:px-8 md:py-32">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow={
              <Eyebrow className="rtl:tracking-normal" index="01">
                {t('programmesSection.eyebrow')}
              </Eyebrow>
            }
            title={
              <span id="programmes-title" className="rtl:leading-[1.4]">
                <SplitWords text={t('programmesSection.title')} />
              </span>
            }
            description={t('programmesSection.description')}
          />
          <div aria-hidden data-reveal className="hidden items-center gap-2 lg:flex">
            <span className="size-3 rounded-full bg-teal" />
            <span className="size-3 rounded-full bg-maroon" />
            <span className="size-3 rounded-full bg-sky" />
          </div>
        </div>
        {isPending ? (
          <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[620px] rounded-[1.75rem]" />
            ))}
          </div>
        ) : isError ? (
          <SectionError what={t('errors.programmes')} onRetry={() => refetch()} />
        ) : (
          <ScrollReveal className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {data.map((programme) => (
              <div key={programme.code} data-reveal="card" className="h-full">
                <ProgrammeShowcaseCard programme={programme} />
              </div>
            ))}
          </ScrollReveal>
        )}
      </ScrollReveal>
    </section>
  )
}
