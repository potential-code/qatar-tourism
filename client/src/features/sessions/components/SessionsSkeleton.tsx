import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'

/** Loading state in the shape of the page: hero, bookings, then the session list. */
export function SessionsSkeleton() {
  const { t } = useTranslation('sessions')
  return (
    <div className="flex flex-col gap-8" aria-busy="true">
      <span className="sr-only">{t('page.loading')}</span>
      <Skeleton className="h-72 w-full rounded-xl md:h-80" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
