import { Skeleton } from '@/components/ui/skeleton'

/** Generic page-shaped loading state for trainer pages: header, tiles, then rows. */
export function WorkspaceSkeleton({ hero = false, rows = 4 }: { hero?: boolean; rows?: number }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <span className="sr-only">Loading</span>
      {hero ? <Skeleton className="h-80 w-full rounded-xl" /> : <Skeleton className="h-12 w-72" />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, i) => `row-${i + 1}`).map((key) => (
          <Skeleton key={key} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
