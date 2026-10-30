import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Stagger, StaggerItem } from '@/components/motion'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicLayout } from '@/features/public-site/components/PublicLayout'
import { SectionError } from '@/features/public-site/components/SectionState'
import { programmesQuery } from '../queries/programmes.queries'
import { ProgrammeCard } from './ProgrammeCard'
import { PublicPageIntro } from './PublicPageIntro'

/** Programme catalogue (brief §3): A and B are active; C is an illustrative sample. */
export function ProgrammesIndexPage() {
  const { t } = useTranslation('public')
  const { data, isPending, isError, refetch } = useQuery(programmesQuery())
  return (
    <PublicLayout overlayHeader>
      <PublicPageIntro
        title={t('programmesPage.title')}
        image="/images/official/westbay-skyline-007.jpg"
        alt={t('programmesPage.alt')}
      >
        {t('programmesPage.intro')}
      </PublicPageIntro>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-12 px-4 py-14 md:px-8 md:py-20">
        {isPending ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[560px] rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <SectionError what={t('errors.programmes')} onRetry={() => refetch()} />
        ) : (
          <Stagger className="grid gap-6 lg:grid-cols-3" stagger={0.1}>
            <h2 className="sr-only">{t('programmesPage.title')}</h2>
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
