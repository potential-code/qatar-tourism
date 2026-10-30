import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'

export function OverviewSkeleton() {
  const { t } = useTranslation('learner')
  return (
    <div
      className="flex flex-col gap-8"
      role="status"
      aria-busy="true"
      aria-label={t('home.loading')}
    >
      <Skeleton className="h-[19rem] w-full rounded-xl md:h-[22rem]" />
      <Skeleton className="mx-3 -mt-20 h-40 rounded-xl border bg-white md:mx-8" />
      <div className="grid gap-6 lg:grid-cols-12">
        <Skeleton className="h-64 rounded-xl lg:col-span-7" />
        <Skeleton className="h-64 rounded-xl lg:col-span-5" />
        <Skeleton className="h-80 rounded-xl lg:col-span-7" />
        <Skeleton className="h-80 rounded-xl lg:col-span-5" />
      </div>
    </div>
  )
}
