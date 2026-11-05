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
      <div className="flex min-h-[30rem] flex-col justify-between gap-8 rounded-xl bg-teal-deep/15 p-4 sm:p-6 md:min-h-[24rem] md:p-8 lg:p-10">
        <div className="flex flex-col gap-8 px-2 pt-2 sm:px-0 sm:pt-0">
          <Skeleton className="h-9 w-56 rounded-full bg-white/60" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-11 w-72 max-w-full bg-white/60" />
            <Skeleton className="h-5 w-96 max-w-full bg-white/60" />
          </div>
        </div>
        <div className="grid gap-5 rounded-xl bg-ink/10 p-5 md:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-24 bg-white/60" />
            <Skeleton className="h-8 w-80 max-w-full bg-white/60" />
            <Skeleton className="h-4 w-64 max-w-full bg-white/60" />
            <Skeleton className="mt-1 h-12 w-32 rounded-full bg-white/60" />
          </div>
          <Skeleton className="size-22 rounded-full bg-white/60" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <Skeleton className="h-64 rounded-xl lg:col-span-7" />
        <Skeleton className="h-64 rounded-xl lg:col-span-5" />
        <Skeleton className="h-80 rounded-xl lg:col-span-7" />
        <Skeleton className="h-80 rounded-xl lg:col-span-5" />
      </div>
    </div>
  )
}
