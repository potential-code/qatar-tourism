import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CalendarDays, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { analyticsKeys } from '../queries/analytics.queries'
import { calendarDate, qatarTime } from '../utils/format'

/** Title block: reporting date, Last updated (Qatar time) and refresh. The portal header carries the Demo data indicator. */
export function DashboardHeader({
  asOf,
  referenceDate,
  isFetching,
}: {
  asOf?: string
  referenceDate?: string
  isFetching: boolean
}) {
  const queryClient = useQueryClient()
  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div className="grid gap-2">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4 text-teal" aria-hidden />
          Reporting date {referenceDate ? calendarDate(referenceDate) : '...'}
        </p>
        <h1 className="font-display text-4xl leading-[1.1] font-light text-ink">
          Academy overview
        </h1>
        <p className="max-w-[62ch] text-muted-foreground">
          The Service Excellence Academy at a glance. Every figure is computed from the demo
          records, so it matches the reports it opens.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {asOf ? `Last updated ${qatarTime(asOf)} Qatar time` : 'Loading'}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: analyticsKeys.all })}
          aria-label="Refresh dashboard"
        >
          <RefreshCw className={cn(isFetching && 'animate-spin')} aria-hidden />
          Refresh
        </Button>
        <Button asChild size="sm">
          <Link to="/admin/ai-analytics">
            <Sparkles aria-hidden /> Ask AI Analytics
          </Link>
        </Button>
      </div>
    </header>
  )
}
