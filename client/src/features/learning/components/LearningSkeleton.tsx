import { Skeleton } from '@/components/ui/skeleton'

export function LearningSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-busy="true"
      aria-label="Loading your learning path"
    >
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-36 w-full rounded-xl" />
      {['s1', 's2', 's3', 's4', 's5'].map((key) => (
        <Skeleton key={key} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  )
}
